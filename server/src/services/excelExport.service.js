import ExcelJS from 'exceljs';

/**
 * Generates an Excel workbook buffer from columns and rows definitions.
 * @param {string} sheetName WorkSheet name
 * @param {Array<{header: string, key: string, width?: number}>} columns Column configs
 * @param {Array<Object>} data Data rows
 * @returns {Promise<Buffer>} Excel file buffer
 */
export const createExcelStream = async (sheetName, columns, data, res, filename) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Demirbaş Takip Sistemi';
  workbook.lastModifiedBy = 'Demirbaş Takip Sistemi';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 20,
  }));

  // Style Header Row (Dark navy #1E2534, white bold text)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E2534' },
    };
    cell.font = {
      name: 'Arial',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'medium', color: { argb: 'FF1E2534' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
  });

  // Add Data Rows
  data.forEach((rowObj, index) => {
    const row = worksheet.addRow(rowObj);
    row.height = 22;
    const isEven = index % 2 === 0;

    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF1E2534' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF9FAFB' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
  });

  // Set HTTP Headers for file download
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
};
