import XLSX from 'xlsx';
import prisma from '../../config/db.js';
import { importRegistry } from './registry.js';
import { resolveReferences, getResolvedValue } from './import.resolver.js';

export function getModuleConfig(moduleKey) {
  const config = importRegistry[moduleKey];
  if (!config) {
    throw new Error(`Bilinmeyen modül anahtarı: ${moduleKey}`);
  }
  return config;
}

export function generateTemplate(moduleKey) {
  const config = getModuleConfig(moduleKey);
  const headers = config.columns.map(col => col.header);
  
  // Create example row
  const exampleRow = {};
  config.columns.forEach(col => {
    if (col.type === 'number') exampleRow[col.header] = 10;
    else if (col.type === 'date') exampleRow[col.header] = '2026-01-01';
    else if (col.type === 'reference') exampleRow[col.header] = 'Örnek ' + col.header;
    else exampleRow[col.header] = 'Örnek ' + col.header;
  });

  const worksheet = XLSX.utils.json_to_sheet([exampleRow], { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, config.label);
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export async function parseAndValidate(moduleKey, fileBuffer, updateExisting = false) {
  const config = getModuleConfig(moduleKey);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!rawRows || rawRows.length === 0) {
    return {
      validCount: 0,
      invalidCount: 0,
      rows: [],
      errors: ['Excel dosyasında okunacak veri bulunamadı.'],
    };
  }

  // Header mapping: Header label -> col.key
  const headerToKey = {};
  config.columns.forEach(col => {
    headerToKey[col.header] = col.key;
    headerToKey[col.key] = col.key;
  });

  // Map raw row objects to standardized key-value objects
  const parsedRows = rawRows.map((rawRow, index) => {
    const parsed = { _rowIndex: index + 2 };
    Object.keys(rawRow).forEach(rawHeader => {
      const trimmedHeader = String(rawHeader).trim();
      const targetKey = headerToKey[trimmedHeader] || headerToKey[rawHeader];
      if (targetKey) {
        parsed[targetKey] = rawRow[rawHeader];
      }
    });
    return parsed;
  });

  // Resolve reference fields in batch
  const refCache = await resolveReferences(config, parsedRows);

  // Check uniqueKeys in database if configured
  const existingUniqueMap = new Map(); // val -> dbRecord
  if (config.uniqueKey) {
    const uniqueValsInFile = parsedRows
      .map(r => r[config.uniqueKey])
      .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
      .map(v => String(v).trim());

    if (uniqueValsInFile.length > 0) {
      const dbRecords = await prisma[config.prismaModel].findMany({
        where: {
          [config.uniqueKey]: { in: uniqueValsInFile }
        }
      });
      dbRecords.forEach(r => existingUniqueMap.set(String(r[config.uniqueKey]).trim().toLowerCase(), r));
    }
  }

  const validatedRows = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const row of parsedRows) {
    const rowErrors = [];
    const resolvedRefs = {};
    let isUpdateAction = false;
    let existingRecordId = null;

    for (const col of config.columns) {
      const val = row[col.key];

      // Required Check
      if (col.required && (val === undefined || val === null || String(val).trim() === '')) {
        rowErrors.push(`"${col.header}" alanı zorunludur.`);
        continue;
      }

      // Type, Reference & Pattern Check
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        if (col.type === 'number' && isNaN(Number(val))) {
          rowErrors.push(`"${col.header}" bir sayı olmalıdır.`);
        } else if (col.type === 'reference') {
          const resolvedId = getResolvedValue(col, val, refCache);
          if (!resolvedId) {
            rowErrors.push(`"${val}" isimli ${col.header} sistemde bulunamadı.`);
          } else {
            resolvedRefs[col.resolveTo] = resolvedId;
          }
        }

        if (col.pattern && !col.pattern.test(String(val).trim())) {
          rowErrors.push(col.patternMessage || `"${col.header}" geçersiz formatta.`);
        }
      }
    }

    // Unique Key Check (Internal in file + DB)
    if (config.uniqueKey && row[config.uniqueKey]) {
      const valStr = String(row[config.uniqueKey]).trim().toLowerCase();
      if (existingUniqueMap.has(valStr)) {
        if (updateExisting) {
          isUpdateAction = true;
          existingRecordId = existingUniqueMap.get(valStr).id;
        } else {
          rowErrors.push(`"${row[config.uniqueKey]}" ${config.columns.find(c => c.key === config.uniqueKey)?.header || config.uniqueKey} zaten sistemde mevcut.`);
        }
      }
    }

    const isValid = rowErrors.length === 0;
    if (isValid) validCount++;
    else invalidCount++;

    validatedRows.push({
      rowIndex: row._rowIndex,
      data: row,
      resolvedRefs,
      isValid,
      isUpdateAction,
      existingRecordId,
      errors: rowErrors,
    });
  }

  return {
    validCount,
    invalidCount,
    rows: validatedRows,
    errors: [],
  };
}

export async function commitImport(moduleKey, rowsToCommit, userId) {
  const config = getModuleConfig(moduleKey);
  let createdCount = 0;
  let updatedCount = 0;

  for (const item of rowsToCommit) {
    const formattedData = config.transformRow(item.data, item.resolvedRefs, userId);
    
    if (item.isUpdateAction && item.existingRecordId) {
      await prisma[config.prismaModel].update({
        where: { id: item.existingRecordId },
        data: formattedData,
      });
      updatedCount++;
    } else {
      await prisma[config.prismaModel].create({
        data: formattedData,
      });
      createdCount++;
    }
  }

  return {
    success: true,
    createdCount,
    updatedCount,
  };
}
