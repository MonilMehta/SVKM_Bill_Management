


import ExcelJS from 'exceljs';
import Bill from '../models/bill-model.js';
import CurrencyMaster from '../models/currency-master-model.js';
import PanStatusMaster from '../models/pan-status-master-model.js';
import ComplianceMaster from '../models/compliance-master-model.js';
import RegionMaster from '../models/region-master-model.js';
import { headerMapping } from './headerMap.js'; // Import centralized header mapping

/**
 * Reads an Excel file and extracts each data row (for debugging purposes)
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<void>}
 * @throws {Error} If no worksheet is found
 */
export async function extractPatchRowsFromExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('No worksheet found');

  let headerRowIdx = 1;
  let headers = [];
  worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
    headers.push(cell.value?.toString().trim());
  });
  
  if (headers[0]?.toLowerCase().includes('report generated')) {
    headerRowIdx++;
    headers = [];
    worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
      headers.push(cell.value?.toString().trim());
    });
  }

  for (let rowNumber = headerRowIdx + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.getCell(1).value) continue;
    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      rowData[header] = cell.value;
    });
  }
}

// Use centralized header mapping from headerMap.js
const headerToDbField = headerMapping;

/**
 * Checks if a value is filled (not undefined, null, or empty string)
 * @param {*} val - Value to check
 * @returns {boolean} True if value is filled
 */
function isFilled(val) {
  return val !== undefined && val !== null && val !== '';
}

/**
 * Parses a date string if the field is a date field
 * @param {string} field - Field name
 * @param {*} value - Value to parse
 * @returns {Date|*} Parsed date or original value
 */
function parseDateIfNeeded(field, value) {
  if (!value || typeof value !== 'string') return value;
  const dateFields = ['taxInvDate', 'poDate', 'advanceDate', 'proformaInvDate'];
  if (dateFields.includes(field)) {
    const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
      const [_, day, month, year] = match;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    if (!isNaN(Date.parse(value))) {
      return new Date(value);
    }
  }
  return value;
}

/**
 * Parses a number string if the field is a number field
 * @param {string} field - Field name
 * @param {*} value - Value to parse
 * @returns {number|*} Parsed number or original value
 */
function parseNumberIfNeeded(field, value) {
  const numberFields = ['poAmt', 'taxInvAmt'];
  if (numberFields.includes(field) && typeof value === 'string') {
    const cleaned = value.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? value : num;
  }
  return value;
}

/**
 * Maps reference field values to their ObjectIds from master collections
 * @param {string} field - Field name
 * @param {*} value - Value to map
 * @returns {Promise<string|undefined>} ObjectId as string or undefined
 */
const referenceLookupCache = {
  currency: null,
  panStatus: null,
  compliance206AB: null,
  region: null
};

function buildLookupMap(collection, extractKey, extractValue) {
  const map = new Map();
  collection.forEach(doc => {
    const key = extractKey(doc);
    if (!key) return;
    map.set(key.toString().trim().toLowerCase(), extractValue(doc));
  });
  return map;
}

async function getReferenceLookup(field) {
  if (referenceLookupCache[field]) {
    return referenceLookupCache[field];
  }

  switch (field) {
    case 'currency': {
      const docs = await CurrencyMaster.find().lean();
      referenceLookupCache.currency = buildLookupMap(docs, doc => doc.currency, doc => doc._id.toString());
      break;
    }
    case 'panStatus': {
      const docs = await PanStatusMaster.find().lean();
      referenceLookupCache.panStatus = buildLookupMap(docs, doc => doc.panStatus || doc.name, doc => doc._id.toString());
      break;
    }
    case 'compliance206AB': {
      const docs = await ComplianceMaster.find().lean();
      referenceLookupCache.compliance206AB = buildLookupMap(docs, doc => doc.compliance206AB, doc => doc._id.toString());
      break;
    }
    case 'region': {
      const docs = await RegionMaster.find().lean();
      referenceLookupCache.region = buildLookupMap(docs, doc => doc.name, doc => doc.name);
      break;
    }
    default:
      referenceLookupCache[field] = new Map();
  }

  return referenceLookupCache[field] || new Map();
}

async function mapReferenceIfNeeded(field, value) {
  if (value === undefined || value === null) {
    return value;
  }

  const stringValue = value.toString().trim();
  if (!stringValue) {
    return undefined;
  }

  const lookup = await getReferenceLookup(field);
  if (!lookup.size) {
    return undefined;
  }

  const normalized = stringValue.toLowerCase();
  if (lookup.has(normalized)) {
    return lookup.get(normalized);
  }

  for (const [candidate, mappedValue] of lookup.entries()) {
    if (candidate.includes(normalized) || normalized.includes(candidate)) {
      return mappedValue;
    }
  }

  return undefined;
}

/**
 * Team field restrictions defining which fields each team can update
 */
const teamFieldRestrictions = {
  "QS Team": [
    "copDetails.date",
    "copDetails.amount"
  ],
  "Site Team": [
    "migoDetails.no",
    "migoDetails.date",
    "migoDetails.amount",
    "migoDetails.doneBy"
  ],
  "PIMO & MIGO/SES Team": [
    "sesDetails.no",
    "sesDetails.amount",
    "sesDetails.date",
    "sesDetails.doneBy",
    "pimoMumbai.dateReturnedFromDirector"
  ],
  "Accounts Team": [
    "accountsDept.f110Identification",
    "accountsDept.paymentDate",
    "accountsDept.hardCopy",
    "accountsDept.accountsIdentification",
    "accountsDept.paymentAmt",
    "miroDetails.number",
    "miroDetails.date",
    "miroDetails.amount"
  ]
};

/**
 * Maps Excel header names to their corresponding database fields
 */
const specialFieldsMap = {
  'COP Dt': 'copDetails.date',
  'COP Amt': 'copDetails.amount',
  'MIGO no': 'migoDetails.no',
  'MIGO Dt': 'migoDetails.date',
  'MIGO Amt': 'migoDetails.amount',
  'MIGO done by': 'migoDetails.doneBy',
  'SES no': 'sesDetails.no',
  'SES Amt': 'sesDetails.amount',
  'SES Dt': 'sesDetails.date',
  'SES done by': 'sesDetails.doneBy',
  'Dt ret-PIMO aft approval': 'pimoMumbai.dateReturnedFromDirector',
  'F110 Identification': 'accountsDept.f110Identification',
  'Dt of Payment': 'accountsDept.paymentDate',
  'Hard Copy': 'accountsDept.hardCopy',
  'Accts Identification': 'accountsDept.accountsIdentification',
  'Payment Amt': 'accountsDept.paymentAmt',
  'MIRO no': 'miroDetails.number',
  'MIRO Dt': 'miroDetails.date',
  'MIRO Amt': 'miroDetails.amount'
};

/**
 * All allowed nested fields for patch operations
 */
const allAllowedFields = [
  "copDetails.date",
  "copDetails.amount",
  "migoDetails.no",
  "migoDetails.date",
  "migoDetails.amount",
  "migoDetails.doneBy",
  "sesDetails.no",
  "sesDetails.amount",
  "sesDetails.date",
  "sesDetails.doneBy",
  "pimoMumbai.dateReturnedFromDirector",
  "accountsDept.f110Identification",
  "accountsDept.paymentDate",
  "accountsDept.hardCopy",
  "accountsDept.accountsIdentification",
  "accountsDept.paymentAmt",
  "miroDetails.number",
  "miroDetails.date",
  "miroDetails.amount"
];

/**
 * Maps role names to team names
 */
const roleToTeam = {
  'qs_site': 'QS Team',
  'qs_mumbai': 'QS Team',
  'site_officer': 'Site Team',
  'site_engineer': 'Site Team',
  'site_incharge': 'Site Team',
  'site_architect': 'Site Team',
  'pimo_mumbai': 'PIMO & MIGO/SES Team',
  'site_pimo': 'PIMO & MIGO/SES Team',
  'accounts': 'Accounts Team',
};

/**
 * Reads workbook and finds the headers row (skipping report header if present)
 * @param {Object} workbook - ExcelJS workbook object
 * @returns {Object} Object containing worksheet, headers, and headerRowIdx
 * @throws {Error} If no worksheet is found
 */
function readWorkbookAndHeaders(workbook) {
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('No worksheet found');

  let headerRowIdx = 1;
  let headers = [];
  worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
    headers.push(cell.value?.toString().trim());
  });
  
  if (headers[0]?.toLowerCase().includes('report generated')) {
    headerRowIdx++;
    headers = [];
    worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
      headers.push(cell.value?.toString().trim());
    });
  }

  return { worksheet, headers, headerRowIdx };
}

/**
 * Maps team name to actual team using roleToTeam mapping
 * @param {string} teamName - Original team or role name
 * @returns {string|null} Mapped team name or null
 */
function mapTeamName(teamName) {
  if (!teamName) return null;
  return roleToTeam[teamName] || teamName;
}

/**
 * Gets the list of allowed fields for a specific team
 * @param {string} teamName - Team or role name
 * @returns {Array<string>} Array of allowed field names
 */
function getAllowedFieldsForTeam(teamName) {
  const mappedTeam = mapTeamName(teamName);
  const allowedFields = mappedTeam && teamFieldRestrictions[mappedTeam] 
    ? teamFieldRestrictions[mappedTeam] 
    : [];
  
  return allowedFields;
}

/**
 * Extracts row data from an Excel row
 * @param {Object} row - ExcelJS row object
 * @param {Array<string>} headers - Array of header names
 * @returns {Object} Row data as key-value pairs
 */
function extractPatchRowData(row, headers) {
  const rowData = {};
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = headers[colNumber - 1];
    rowData[header] = cell.value;
  });
  return rowData;
}

/**
 * Validates and parses hardCopy field value
 * @param {*} value - Value to validate
 * @returns {string|null} 'YES' or 'NO' if valid, null otherwise
 */
function validateHardCopyField(value) {
  if (!value) return null;
  const hardCopyValue = String(value).trim().toUpperCase();
  if (hardCopyValue !== 'YES' && hardCopyValue !== 'NO') {
    return null;
  }
  return hardCopyValue;
}

/**
 * Parses field value based on field type (date, number, or text)
 * @param {string} dbField - Database field name
 * @param {*} value - Value to parse
 * @returns {*} Parsed value
 */
function parseFieldValue(dbField, value) {
  let parsedValue = value;
  
  if (dbField === 'accountsDept.hardCopy') {
    return validateHardCopyField(value);
  }
  
  if (dbField.includes('.date') || dbField.includes('Dt')) {
    parsedValue = parseDateIfNeeded(dbField, value);
  }
  
  if (dbField.includes('.amount') || dbField.includes('Amt')) {
    parsedValue = parseNumberIfNeeded(dbField, value);
  }
  
  return parsedValue;
}

/**
 * Checks if field update is allowed based on team restrictions
 * @param {string} dbField - Database field name
 * @param {Array<string>} allowedFields - Array of allowed field names for the team
 * @returns {boolean} True if field is allowed
 */
function isFieldAllowed(dbField, allowedFields) {
  return allAllowedFields.includes(dbField) && allowedFields.includes(dbField);
}

/**
 * Initializes update object with existing bill data
 * @param {Object} billData - Existing bill document
 * @returns {Object} Update object with nested structures initialized
 */
function initializeUpdateObject(billData) {
  return {
    accountsDept: billData.accountsDept,
    miroDetails: billData.miroDetails,
    migoDetails: billData.migoDetails,
    sesDetails: billData.sesDetails,
    copDetails: billData.copDetails,
    pimoMumbai: billData.pimoMumbai
  };
}

/**
 * Sets a nested field value in the update object
 * @param {Object} updateObj - Update object to modify
 * @param {string} dbField - Database field name (may contain dots for nesting)
 * @param {*} value - Value to set
 */
function setNestedField(updateObj, dbField, value) {
  const fieldParts = dbField.split('.');
  if (fieldParts.length === 2) {
    if (!updateObj[fieldParts[0]]) {
      updateObj[fieldParts[0]] = {};
    }
    updateObj[fieldParts[0]][fieldParts[1]] = value;
  } else {
    updateObj[dbField] = value;
  }
}

/**
 * Applies business rules to the update object (e.g., auto-set status when payment date is set)
 * @param {Object} updateObj - Update object to apply rules to
 */
function applyBusinessRules(updateObj) {
  if (updateObj.accountsDept && updateObj.accountsDept.paymentDate) {
    updateObj.accountsDept.status = 'Paid';
  }
}

/**
 * Processes a single row for patch updates
 * @param {Object} rowData - Extracted row data
 * @param {number} rowNumber - Current row number
 * @param {Array<string>} allowedFields - Fields allowed for the team
 * @param {Object} updateSummary - Object tracking field update counts
 * @param {Object} ignoredFieldsCount - Object tracking ignored field counts
 * @param {string} teamName - Team name
 * @returns {Promise<Object>} Result object with updated flag and optional srNo or reason
 */
async function processPatchRow(rowData, rowNumber, allowedFields, updateSummary, ignoredFieldsCount, teamName) {
  const srNo = rowData['Sr no'] ? String(rowData['Sr no']).trim() : null;
  
  if (!srNo) {
    return { updated: false, reason: 'missing_srno' };
  }
  
  const bill = await Bill.findOne({ srNo });
  if (!bill) {
    return { updated: false, reason: 'bill_not_found' };
  }

  const billData = bill.toObject();
  const updateObj = initializeUpdateObject(billData);
  let hasUpdate = false;

  for (const [header, dbField] of Object.entries(specialFieldsMap)) {
    if (!isFieldAllowed(dbField, allowedFields)) {
      if (!ignoredFieldsCount[dbField]) {
        ignoredFieldsCount[dbField] = 0;
      }
      ignoredFieldsCount[dbField]++;
      continue;
    }
    
    if (!isFilled(rowData[header])) {
      continue;
    }
    
    const parsedValue = parseFieldValue(dbField, rowData[header]);
    if (parsedValue === null) {
      continue;
    }
    
    setNestedField(updateObj, dbField, parsedValue);
    
    if (!updateSummary[dbField]) {
      updateSummary[dbField] = 0;
    }
    updateSummary[dbField]++;
    hasUpdate = true;
  }

  applyBusinessRules(updateObj);

  if (hasUpdate) {
    await Bill.updateOne({ _id: bill._id }, { $set: updateObj });
    return { updated: true, srNo };
  } else {
    return { updated: false, reason: 'no_updates' };
  }
}

/**
 * Formats patch results into a response object
 * @param {number} updated - Number of bills updated
 * @param {number} skipped - Number of bills skipped
 * @param {string} teamName - Team name
 * @param {Object} updateSummary - Field update summary
 * @param {Object} ignoredFieldsCount - Ignored field counts
 * @param {Array<string>} allowedFields - Allowed fields for the team
 * @returns {Object} Formatted result object
 */
/**
 * Formats patch results into a response object
 * @param {number} updated - Number of bills updated
 * @param {number} skipped - Number of bills skipped
 * @param {string} teamName - Team name
 * @param {Object} updateSummary - Field update summary
 * @param {Object} ignoredFieldsCount - Ignored field counts
 * @param {Array<string>} allowedFields - Allowed fields for the team
 * @returns {Object} Formatted result object
 */
function formatPatchResults(updated, skipped, teamName, updateSummary, ignoredFieldsCount, allowedFields) {
  const totalIgnoredUpdates = Object.values(ignoredFieldsCount).reduce((sum, count) => sum + count, 0);

  return {
    updated,
    skipped,
    teamName,
    fieldUpdateSummary: updateSummary,
    ignoredFields: {
      count: Object.keys(ignoredFieldsCount).length,
      totalUpdatesIgnored: totalIgnoredUpdates,
      fields: ignoredFieldsCount
    },
    teamRestrictions: {
      active: !!teamName,
      allowedFields: allowedFields.length > 0 ? allowedFields : 'none'
    }
  };
}

/**
 * Patches bills from an Excel file with team-based field restrictions
 * @param {string} filePath - Path to the Excel file
 * @param {string|null} teamName - Team or role name for field restrictions
 * @returns {Promise<Object>} Object containing patch statistics and results
 * @throws {Error} If Excel file cannot be read or no worksheet is found
 */
export async function patchBillsFromExcelFile(filePath, teamName = null) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const { worksheet, headers, headerRowIdx } = readWorkbookAndHeaders(workbook);
  const allowedFields = getAllowedFieldsForTeam(teamName);
  
  let updated = 0, skipped = 0;
  let updateSummary = {};
  let ignoredFieldsCount = {};
  
  for (let rowNumber = headerRowIdx + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.getCell(1).value) continue;
    
    const rowData = extractPatchRowData(row, headers);
    
    const result = await processPatchRow(rowData, rowNumber, allowedFields, updateSummary, ignoredFieldsCount, teamName);
    
    if (result.updated) {
      updated++;
    } else {
      skipped++;
    }
  }
  
  return formatPatchResults(updated, skipped, teamName, updateSummary, ignoredFieldsCount, allowedFields);
}

