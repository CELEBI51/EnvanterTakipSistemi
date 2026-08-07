import prisma from '../../config/db.js';

export async function resolveReferences(moduleConfig, rows) {
  const refCols = moduleConfig.columns.filter(c => c.type === 'reference');
  const cache = {}; // e.g. { category: { "Laptop": "uuid-123" } }

  for (const col of refCols) {
    const modelName = col.lookupModel;
    if (!cache[modelName]) cache[modelName] = {};

    // Collect all distinct text values from rows for this column
    const distinctValues = Array.from(new Set(
      rows
        .map(r => r[col.key])
        .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
        .map(v => String(v).trim())
    ));

    if (distinctValues.length === 0) continue;

    const whereClause = {
      [col.lookupField]: { in: distinctValues }
    };
    if (col.extraFilter) {
      Object.assign(whereClause, col.extraFilter);
    }

    const records = await prisma[modelName].findMany({
      where: whereClause
    });

    for (const rec of records) {
      const keyVal = String(rec[col.lookupField]).trim().toLowerCase();
      cache[modelName][keyVal] = rec.id;
    }
  }

  return cache;
}

export function getResolvedValue(colConfig, textValue, cache) {
  if (!textValue) return null;
  const keyVal = String(textValue).trim().toLowerCase();
  const modelCache = cache[colConfig.lookupModel];
  if (!modelCache) return null;
  return modelCache[keyVal] || null;
}
