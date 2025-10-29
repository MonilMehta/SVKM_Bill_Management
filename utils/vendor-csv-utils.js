import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import VendorMaster from '../models/vendor-master-model.js';
import ComplianceMaster from '../models/compliance-master-model.js';
import PanStatusMaster from '../models/pan-status-master-model.js';

/**
 * Maps reference values for compliance and PAN status
 * @param {string} field - The field name to map
 * @param {string} value - The value to map to an ObjectId
 * @returns {Promise<mongoose.Types.ObjectId|undefined>} The mapped ObjectId or undefined
 */
// Cache for reference values to reduce database queries
const referenceValuesCache = {
  complianceStatus: null,
  PANStatus: null
};

/**
 * Gets all valid values for a reference field from the master tables
 * @param {string} field - The field to get valid values for
 * @returns {Promise<Array<{id: string, value: string}>>} Array of valid values with their IDs
 */
async function getValidReferenceValues(field) {
  // Return from cache if available
  if (referenceValuesCache[field]) {
    return referenceValuesCache[field];
  }

  try {
    let values = [];

    if (field === 'complianceStatus') {
      const docs = await ComplianceMaster.find().lean();
      values = docs.map(doc => ({
        id: doc._id.toString(),
        value: doc.compliance206AB
      }));
    } else if (field === 'PANStatus') {
      const docs = await PanStatusMaster.find().lean();
      values = docs.map(doc => ({
        id: doc._id.toString(),
        value: doc.name
      }));
    }

    // Cache the values for future use
    referenceValuesCache[field] = values;
    return values;
  } catch (error) {
    console.error(`Error fetching valid ${field} values:`, error);
    return [];
  }
}

/**
 * Maps reference values for compliance and PAN status
 * @param {string} field - The field name to map
 * @param {string} value - The value to map to an ObjectId
 * @returns {Promise<{id: string|undefined, validValues: Array<string>, bestMatch: string|undefined}>} The mapped ObjectId or undefined, and list of valid values
 */
async function mapReferenceValue(field, value) {
  if (!value || typeof value !== 'string') {
    return { id: undefined, validValues: [], bestMatch: undefined };
  }

  // Get all valid values for this field
  const validValues = await getValidReferenceValues(field);

  if (validValues.length === 0) {
    console.warn(`No valid ${field} values found in the database`);
    return { id: undefined, validValues: [], bestMatch: undefined };
  }

  // First try exact case-insensitive match
  const exactMatch = validValues.find(item =>
    item.value.toLowerCase() === value.toLowerCase()
  );

  if (exactMatch) {
    return {
      id: exactMatch.id,
      validValues: validValues.map(v => v.value),
      bestMatch: exactMatch.value
    };
  }

  // Try fuzzy matching - check if the input value contains any of the valid values or vice versa
  for (const validValue of validValues) {
    if (validValue.value.toLowerCase().includes(value.toLowerCase()) ||
      value.toLowerCase().includes(validValue.value.toLowerCase())) {
      return {
        id: validValue.id,
        validValues: validValues.map(v => v.value),
        bestMatch: validValue.value
      };
    }
  }

  // No match found
  return {
    id: undefined,
    validValues: validValues.map(v => v.value),
    bestMatch: undefined
  };
}

/**
 * Inserts vendors from an Excel file into the vendor master collection
 * @param {string} filePath - Path to the Excel file containing vendor data
 * @returns {Promise<Object>} Results of the operation
 */
/**
 * Creates missing master values if they don't exist
 * @param {boolean} createMissing - Whether to create missing master values
 * @returns {Promise<void>}
 */
async function ensureMasterValuesExist(createMissing = false) {
  if (!createMissing) return;

  try {
    // Common compliance statuses
    const complianceStatuses = [
      'Compliant',
      'Non-Compliant',
      'Pending Verification U/S 206AB',
      '2024-Pending Verification U/S 206AB',
      'Compliant under 206AB',
      'Not Applicable'
    ];

    // Common PAN statuses
    const panStatuses = [
      'Valid',
      'Invalid',
      'PAN operative',
      'PAN not available',
      'PAN invalid',
      'Not Available'
    ];

    for (const status of complianceStatuses) {
      const exists = await ComplianceMaster.findOne({
        compliance206AB: { $regex: new RegExp(`^${status}$`, 'i') }
      });

      if (!exists) {
        await ComplianceMaster.create({ compliance206AB: status });
      }
    }

    for (const status of panStatuses) {
      const exists = await PanStatusMaster.findOne({
        name: { $regex: new RegExp(`^${status}$`, 'i') }
      });

      if (!exists) {
        await PanStatusMaster.create({
          name: status.toUpperCase(),
          description: `Auto-created from import on ${new Date().toISOString().split('T')[0]}`,
          isActive: true
        });
      }
    }

    // Clear the cache to reload values
    referenceValuesCache.complianceStatus = null;
    referenceValuesCache.PANStatus = null;

  } catch (error) {
    console.error('Error ensuring master values exist:', error);
  }
}

/**
 * Reads Excel workbook and finds the headers row
 * @param {Object} workbook - ExcelJS workbook object
 * @returns {Object} Object containing worksheet, headers, and headerRowIdx
 * @throws {Error} If no worksheet is found
 */
function readVendorWorkbook(workbook) {
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('No worksheet found');

  let headerRowIdx = 1;
  let headers = [];

  worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
    headers.push(cell.value?.toString().trim());
  });

  if (headers[0]?.toLowerCase().includes('report generated') || headers.length < 3 ||
    (headers[0] === 'S.No' || headers[0] === 'Sr No' || headers[0] === 'Sl.No')) {
    headerRowIdx = 2;
    headers = [];
    worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
      headers.push(cell.value?.toString().trim());
    });
  }

  return { worksheet, headers, headerRowIdx };
}

/**
 * Extracts vendor data from an Excel row
 * @param {Object} row - Excel row object
 * @param {Array} headers - Array of header names
 * @returns {Object} Raw vendor data object
 */
function extractVendorRowData(row, headers) {
  const rowData = {};
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = headers[colNumber - 1];
    rowData[header] = cell.value;
  });
  return rowData;
}

/**
 * Parses vendor number from various formats
 * @param {*} value - Value to parse
 * @param {number} rowNumber - Row number for logging
 * @returns {number|*} Parsed vendor number or original value
 */
function parseVendorNumber(value, rowNumber) {
  if (typeof value === 'string') {
    return parseInt(value.replace(/[^\d]/g, ''), 10);
  } else if (typeof value === 'number') {
    return value;
  } else if (value instanceof Date) {
    return value.getTime();
  }
  return value;
}

/**
 * Parses array field (email or phone numbers)
 * @param {*} value - Value to parse
 * @returns {Array} Array of parsed values
 */
function parseArrayField(value) {
  if (typeof value === 'string') {
    return value.split(/[,;\s\n\r]+/).map(v => v.trim()).filter(Boolean);
  } else if (Array.isArray(value)) {
    return value.map(v => v.toString().trim()).filter(Boolean);
  } else if (value) {
    return [value.toString().trim()];
  } else {
    return [];
  }
}

/**
 * Maps reference field value to master data ObjectId
 * @param {string} field - Field name (complianceStatus or PANStatus)
 * @param {string} value - Value to map
 * @param {number} rowNumber - Row number for logging
 * @returns {Promise<ObjectId|null>} Mapped ObjectId or null if not found
 */
async function mapReferenceField(field, value, rowNumber) {
  const { id, validValues, bestMatch } = await mapReferenceValue(field, value.toString());

  if (id) {
    return id;
  } else {
    const fieldDisplay = field === 'complianceStatus' ? '206AB Compliance' : 'PAN Status';
    const validOptionsMsg = validValues.length > 0
      ? `Valid options are: ${validValues.join(', ')}`
      : 'No valid options found in master table';

    return null;
  }
}

/**
 * Processes vendor row data and extracts vendor fields
 * @param {Object} rowData - Raw row data
 * @param {number} rowNumber - Row number for logging
 * @returns {Promise<Object>} Processed vendor data
 */
async function processVendorRowData(rowData, rowNumber) {
  const vendorData = {};

  for (const [header, dbField] of Object.entries(VENDOR_HEADER_MAPPING)) {
    if (rowData[header] !== undefined && rowData[header] !== null) {
      let value = rowData[header];

      if (dbField === 'vendorNo') {
        value = parseVendorNumber(value, rowNumber);
      }

      if (dbField === 'emailIds' || dbField === 'phoneNumbers') {
        value = parseArrayField(value);
      }

      if (dbField === 'complianceStatus' || dbField === 'PANStatus') {
        const mappedId = await mapReferenceField(dbField, value, rowNumber);
        if (mappedId) {
          vendorData[dbField] = mappedId;
        }
      } else {
        vendorData[dbField] = value;
      }
    }
  }

  return vendorData;
}

/**
 * Validates required vendor fields
 * @param {Object} vendorData - Vendor data to validate
 * @param {number} rowNumber - Row number for logging
 * @param {Object} rowData - Original row data
 * @returns {Object} Validation result with valid flag and optional error message
 */
function validateVendorFields(vendorData, rowNumber, rowData) {
  const requiredFields = ['vendorNo', 'vendorName', 'PANStatus', 'complianceStatus'];
  const missingFields = requiredFields.filter(field => !vendorData[field]);

  if (missingFields.length === 0) {
    return { valid: true };
  }

  if (!vendorData.PAN && vendorData.vendorName) {
    vendorData.PAN = '';
  }

  if (!vendorData.GSTNumber && vendorData.PAN) {
    vendorData.GSTNumber = '';
  }

  const stillMissingFields = requiredFields.filter(field => !vendorData[field]);
  if (stillMissingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${stillMissingFields.join(', ')}`
    };
  } else {
    return { valid: true };
  }
}

/**
 * Ensures contact fields (email and phone) have default values
 * @param {Object} vendorData - Vendor data to ensure contact fields
 */
function ensureContactFields(vendorData) {
  if (!vendorData.emailIds || vendorData.emailIds.length === 0) {
    vendorData.emailIds = [''];
  }

  if (!vendorData.phoneNumbers || vendorData.phoneNumbers.length === 0) {
    vendorData.phoneNumbers = [''];
  }
}

/**
 * Formats vendor import results
 * @param {number} inserted - Number of vendors inserted
 * @param {number} updated - Number of vendors updated
 * @param {number} skipped - Number of vendors skipped
 * @param {Array} errors - Array of error messages
 * @param {Array} validComplianceValues - Valid compliance status values
 * @param {Array} validPanStatusValues - Valid PAN status values
 * @returns {Object} Formatted result object with summary
 */
function formatVendorImportResults(inserted, updated, skipped, errors, validComplianceValues, validPanStatusValues) {
  let summaryMessage = '';
  if (inserted > 0 && skipped === 0) {
    summaryMessage = `Successfully imported ${inserted} new vendor(s)`;
  } else if (inserted > 0 && skipped > 0) {
    summaryMessage = `Imported ${inserted} new vendor(s), skipped ${skipped} existing vendor(s)`;
  } else if (inserted === 0 && skipped > 0) {
    summaryMessage = `No new vendors imported. ${skipped} vendor(s) already exist. Use Mass Update to modify existing vendors.`;
  } else {
    summaryMessage = 'No vendors were imported';
  }

  return {
    inserted,
    updated,
    skipped,
    errors,
    summaryMessage,
    referenceOptions: {
      complianceStatus: validComplianceValues.map(v => v.value),
      panStatus: validPanStatusValues.map(v => v.value)
    }
  };
}

/**
 * Imports vendors from an Excel file
 * @param {string} filePath - Path to Excel file
 * @returns {Promise<Object>} Import result with counts and errors
 * @throws {Error} If file cannot be read or processed
 */
export async function insertVendorsFromExcel(filePath) {
  await ensureMasterValuesExist(false);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const { worksheet, headers, headerRowIdx } = readVendorWorkbook(workbook);

  let inserted = 0, updated = 0, skipped = 0, errors = [];

  for (let rowNumber = headerRowIdx + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.getCell(1).value) continue;

    const rowData = extractVendorRowData(row, headers);

    try {
      const vendorData = await processVendorRowData(rowData, rowNumber);

      // Validate required fields
      const validation = validateVendorFields(vendorData, rowNumber, rowData);
      if (!validation.valid) {
        errors.push({ row: rowNumber, error: validation.error });
        skipped++;
        continue;
      }

      // Ensure email and phone arrays are present
      ensureContactFields(vendorData);

      // Check if vendor already exists
      const existingVendor = await VendorMaster.findOne({ vendorNo: vendorData.vendorNo });

      if (existingVendor) {
        // Skip existing vendor - do not update during import
        skipped++;
        errors.push({
          row: rowNumber,
          error: `Vendor ${vendorData.vendorNo} already exists. Use Mass Update to modify existing vendors.`
        });
      } else {
        await VendorMaster.create(vendorData);
        inserted++;
      }
    } catch (error) {
      errors.push({ row: rowNumber, error: error.message });
      skipped++;
    }
  }

  const validComplianceValues = await getValidReferenceValues('complianceStatus');
  const validPanStatusValues = await getValidReferenceValues('PANStatus');

  return formatVendorImportResults(inserted, updated, skipped, errors, validComplianceValues, validPanStatusValues);
}

/**
 * Updates only the 206AB Compliance and PAN Status fields for vendors from an Excel file
 * @param {string} filePath - Path to the Excel file containing vendor compliance data
 * @returns {Promise<Object>} Results of the operation
 */
export async function updateVendorComplianceFromExcel(filePath) {
  // Do NOT auto-create reference values - set to false
  await ensureMasterValuesExist(false);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('No worksheet found');

  // Find the first row with actual headers (skip report header)
  let headerRowIdx = 1;
  let headers = [];

  // Try to find the headers row - first check if row 1 has headers
  worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
    headers.push(cell.value?.toString().trim());
  });

  // If the first cell is a report header or if the first row has fewer than 3 cells,
  // assume the headers are in row 2 (which is common in exported reports)
  if (headers[0]?.toLowerCase().includes('report generated') || headers.length < 3 ||
    (headers[0] === 'S.No' || headers[0] === 'Sr No' || headers[0] === 'Sl.No')) {
    headerRowIdx = 2;
    headers = [];
    worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
      headers.push(cell.value?.toString().trim());
    });
  }

  const headerToDbField = vendorHeaderMapping;

  let updated = 0, skipped = 0, errors = [];

  for (let rowNumber = headerRowIdx + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.getCell(1).value) continue;

    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      rowData[header] = cell.value;
    });

    try {
      // Extract vendor identifier
      let vendorNo;
      if (rowData['Vendor no'] !== undefined) {
        vendorNo = typeof rowData['Vendor no'] === 'string'
          ? parseInt(rowData['Vendor no'].replace(/[^\d]/g, ''), 10)
          : rowData['Vendor no'];
      } else if (rowData['Vendor No'] !== undefined) {
        vendorNo = typeof rowData['Vendor No'] === 'string'
          ? parseInt(rowData['Vendor No'].replace(/[^\d]/g, ''), 10)
          : rowData['Vendor No'];
      }

      if (!vendorNo || isNaN(vendorNo)) {
        errors.push({
          row: rowNumber,
          error: `Invalid or missing vendor number: ${rowData['Vendor no'] || rowData['Vendor No']}`
        });
        skipped++;
        continue;
      }

      // Find the vendor
      const vendor = await VendorMaster.findOne({ vendorNo });

      if (!vendor) {
        errors.push({
          row: rowNumber,
          error: `Vendor not found with number: ${vendorNo}`
        });
        skipped++;
        continue;
      }

      // Extract fields to update
      const updateObj = {};

      // Process 206AB Compliance
      if (rowData['206AB Compliance'] !== undefined && rowData['206AB Compliance'] !== null) {
        const { id: complianceValue, validValues: validComplianceValues, bestMatch: complianceMatch } =
          await mapReferenceValue('complianceStatus', rowData['206AB Compliance'].toString());

        if (complianceValue) {
          updateObj.complianceStatus = complianceValue;
        }
      }

      if (rowData['PAN Status'] !== undefined && rowData['PAN Status'] !== null) {
        const { id: panStatusValue, validValues: validPanValues, bestMatch: panMatch } =
          await mapReferenceValue('PANStatus', rowData['PAN Status'].toString());

        if (panStatusValue) {
          updateObj.PANStatus = panStatusValue;
        }
      }

      // Process GST Number if available
      if ((rowData['GST Number'] !== undefined && rowData['GST Number'] !== null) ||
        (rowData['GST No'] !== undefined && rowData['GST No'] !== null)) {
        const gstNumber = rowData['GST Number'] || rowData['GST No'];
        if (gstNumber) {
          updateObj.GSTNumber = gstNumber.toString().trim();
        }
      }

      // Process Email
      const emailHeaders = ['Email', 'Email ID', 'Email IDs', 'EmailId', 'Email Address'];
      for (const header of emailHeaders) {
        if (rowData[header] !== undefined && rowData[header] !== null) {
          const emailValue = rowData[header].toString().trim();
          if (emailValue) {
            const emails = emailValue.split(/[,;\s\n\r]+/).map(e => e.trim()).filter(Boolean);
            if (emails.length > 0) {
              updateObj.emailIds = emails;
              break;
            }
          }
        }
      }

      // Process Phone No
      const phoneHeaders = [
        'Phone', 'Phone No', 'Phone No.', 'Phone Number', 'Phone Numbers', 'Mobile', 'Mobile No', 'Mobile Number'
      ];
      for (const header of phoneHeaders) {
        if (rowData[header] !== undefined && rowData[header] !== null) {
          const phoneValue = rowData[header].toString().trim();
          if (phoneValue) {
            const phones = phoneValue.split(/[,;\s\n\r]+/).map(p => p.trim()).filter(Boolean);
            if (phones.length > 0) {
              updateObj.phoneNumbers = phones;
              break;
            }
          }
        }
      }

      // Process Addl 1 - support multiple header variations
      const addl1Headers = ['Addl 1', 'Addl1', 'Additional 1', 'Additional1'];
      for (const header of addl1Headers) {
        if (rowData[header] !== undefined && rowData[header] !== null) {
          const addl1Value = rowData[header].toString().trim();
          if (addl1Value) {
            updateObj.addl1 = addl1Value;
            break;
          }
        }
      }

      // Process Addl 2 - support multiple header variations
      const addl2Headers = ['Addl 2', 'Addl2', 'Additional 2', 'Additional2'];
      for (const header of addl2Headers) {
        if (rowData[header] !== undefined && rowData[header] !== null) {
          const addl2Value = rowData[header].toString().trim();
          if (addl2Value) {
            updateObj.addl2 = addl2Value;            break;
          }
        }
      }

      // Update vendor if we have fields to update
      if (Object.keys(updateObj).length > 0) {
        await VendorMaster.updateOne({ _id: vendor._id }, { $set: updateObj });
        updated++;
        console.log(`[VENDOR COMPLIANCE UPDATE] Updated vendor ${vendorNo} with fields:`, updateObj);
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`[VENDOR COMPLIANCE ERROR] Row ${rowNumber}:`, error);
      errors.push({
        row: rowNumber,
        error: error.message
      });
      skipped++;
    }
  }

  const validComplianceValues = await getValidReferenceValues('complianceStatus');
  const validPanStatusValues = await getValidReferenceValues('PANStatus');

  let summaryMessage = '';
  if (updated > 0 && errors.length === 0) {
    summaryMessage = `Successfully updated ${updated} vendor(s)`;
  } else if (updated > 0 && errors.length > 0) {
    summaryMessage = `Updated ${updated} vendor(s), but ${errors.length} error(s) occurred`;
  } else if (updated === 0 && errors.length > 0) {
    summaryMessage = `No vendors were updated. ${errors.length} error(s) occurred`;
  } else {
    summaryMessage = 'No vendors were updated';
  }

  return {
    updated,
    skipped,
    errors,
    summaryMessage,
    referenceOptions: {
      complianceStatus: validComplianceValues.map(v => v.value),
      panStatus: validPanStatusValues.map(v => v.value)
    }
  };
}
