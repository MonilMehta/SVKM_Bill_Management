


import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import Bill from '../models/bill-model.js';
import NatureOfWorkMaster from '../models/nature-of-work-master-model.js';
import CurrencyMaster from '../models/currency-master-model.js';
import PanStatusMaster from '../models/pan-status-master-model.js';
import ComplianceMaster from '../models/compliance-master-model.js';
import RegionMaster from '../models/region-master-model.js';
import { headerMapping } from './headerMap.js'; // Import centralized header mapping

/**
 * Reads an Excel file, skips the first row (report header), and logs each data row.
 * @param {string} filePath - Path to the Excel file.
 */
export async function extractPatchRowsFromExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('No worksheet found');

  // Find the first row with actual headers (skip report header)
  let headerRowIdx = 1;
  let headers = [];
  worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
    headers.push(cell.value?.toString().trim());
  });
  // If the first cell is a report header, skip to the next row
  if (headers[0]?.toLowerCase().includes('report generated')) {
    headerRowIdx++;
    headers = [];
    worksheet.getRow(headerRowIdx).eachCell({ includeEmpty: false }, cell => {
      headers.push(cell.value?.toString().trim());
    });
  }

  // Process each data row after the header
  for (let rowNumber = headerRowIdx + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.getCell(1).value) continue;
    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      rowData[header] = cell.value;
    });
    // Print the extracted data for this row
    console.log('[PATCH EXTRACT] Data row:', rowData);
  }
}

// Use centralized header mapping from headerMap.js
const headerToDbField = headerMapping;

function isFilled(val) {
  return val !== undefined && val !== null && val !== '';
}

function parseDateIfNeeded(field, value) {
  // Only parse if the field is a date field and value is a string
  if (!value || typeof value !== 'string') return value;
  const dateFields = ['taxInvDate', 'poDate', 'advanceDate', 'proformaInvDate'];
  if (dateFields.includes(field)) {
    // Try to parse DD-MM-YYYY
    const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
      const [_, day, month, year] = match;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    // Try to parse YYYY-MM-DD
    if (!isNaN(Date.parse(value))) {
      return new Date(value);
    }
  }
  return value;
}

function parseNumberIfNeeded(field, value) {
  const numberFields = ['poAmt', 'taxInvAmt'];
  if (numberFields.includes(field) && typeof value === 'string') {
    // Remove commas and parse as float
    const cleaned = value.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? value : num;
  }
  return value;
}

async function mapReferenceIfNeeded(field, value) {
  // Generic handler for all known reference fields
  if (!value || typeof value !== 'string') return value;
  if (field === 'currency') {
    const doc = await CurrencyMaster.findOne({ currency: { $regex: new RegExp(`^${value}$`, 'i') } });
    if (doc) return doc._id;
    return undefined;
  }
  if (field === 'panStatus') {
    const doc = await PanStatusMaster.findOne({ panStatus: { $regex: new RegExp(`^${value}$`, 'i') } });
    if (doc) return doc._id;
    return undefined;
  }
  if (field === 'compliance206AB') {
    const doc = await ComplianceMaster.findOne({ compliance206AB: { $regex: new RegExp(`^${value}$`, 'i') } });
    if (doc) return doc._id;
    return undefined;
  }
  if (field === 'region') {
    const doc = await RegionMaster.findOne({ name: { $regex: new RegExp(`^${value}$`, 'i') } });
    if (doc) return doc.name;
    return undefined;
  }
  return value;
}

// Define team field restrictions
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

// Map Excel header names to their corresponding DB fields for specialized updates
const specialFieldsMap = {
  // QS Team fields
  'COP Dt': 'copDetails.date',
  'COP Amt': 'copDetails.amount',
  
  // Site Team fields
  'MIGO no': 'migoDetails.no',
  'MIGO Dt': 'migoDetails.date',
  'MIGO Amt': 'migoDetails.amount',
  'MIGO done by': 'migoDetails.doneBy',

  // PIMO & MIGO/SES Team fields
  'SES no': 'sesDetails.no',
  'SES Amt': 'sesDetails.amount',
  'SES Dt': 'sesDetails.date',
  'SES done by': 'sesDetails.doneBy',
  'Dt ret-PIMO aft approval': 'pimoMumbai.dateReturnedFromDirector',

  // Accounts Team fields
  'F110 Identification': 'accountsDept.f110Identification',
  'Dt of Payment': 'accountsDept.paymentDate',
  'Hard Copy': 'accountsDept.hardCopy',
  'Accts Identification': 'accountsDept.accountsIdentification',
  'Payment Amt': 'accountsDept.paymentAmt',
  'MIRO no': 'miroDetails.number',
  'MIRO Dt': 'miroDetails.date',
  'MIRO Amt': 'miroDetails.amount'
};

export async function patchBillsFromExcelFile(filePath, teamName = null) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error('No worksheet found');

  // Find the first row with actual headers (skip report header)
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

  let updated = 0, skipped = 0;
  let updateSummary = {};
  let ignoredFieldsCount = {};

  // Only allow updates to the 16 nested fields, and only for the specified team
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

  // Map roles to teams if needed (same as in controller)
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
  let mappedTeam = teamName;
  if (teamName && roleToTeam[teamName]) {
    mappedTeam = roleToTeam[teamName];
  }
  // Determine which fields are allowed based on mapped team
  const allowedFields = mappedTeam && teamFieldRestrictions[mappedTeam] ? teamFieldRestrictions[mappedTeam] : [];
  if (teamName && !mappedTeam) {
    console.log(`[PATCH WARNING] teamName '${teamName}' not mapped to any team restrictions.`);
  }

  console.log(`[PATCH] Team: ${teamName || 'none'}, Allowed fields:`, allowedFields.length > 0 ? allowedFields : 'none');

  console.log('[PATCH DEBUG] Detected headers:', headers);
  for (let rowNumber = headerRowIdx + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    if (!row.getCell(1).value) continue;
    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      rowData[header] = cell.value;
    });
    console.log(`[PATCH DEBUG] Row ${rowNumber} data:`, rowData);
    const srNo = rowData['Sr no'] ? String(rowData['Sr no']).trim() : null;
    if (!srNo) { skipped++; console.log(`[PATCH DEBUG] Row ${rowNumber} skipped: missing Sr no`); continue; }
    const bill = await Bill.findOne({ srNo });
    if (!bill) { skipped++; console.log(`[PATCH DEBUG] Row ${rowNumber} skipped: bill not found for Sr no ${srNo}`); continue; }
    const updateObj = {};
    const billData = await Bill.findById(bill._id);
    updateObj.accountsDept = billData.accountsDept;
    updateObj.miroDetails = billData.miroDetails;
    updateObj.migoDetails = billData.migoDetails;
    updateObj.sesDetails = billData.sesDetails;
    updateObj.copDetails = billData.copDetails;
    updateObj.pimoMumbai = billData.pimoMumbai;
    let hasUpdate = false;

    // Only process specialFieldsMap, and only for allowed fields
    for (const [header, dbField] of Object.entries(specialFieldsMap)) {
      // Only allow if in both allAllowedFields and allowedFields
      if (!allAllowedFields.includes(dbField) || !allowedFields.includes(dbField)) {
        // Track ignored fields for reporting
        if (!ignoredFieldsCount[dbField]) {
          ignoredFieldsCount[dbField] = 0;
        }
        ignoredFieldsCount[dbField]++;
        console.log(`[PATCH DEBUG] Field '${header}' (db: ${dbField}) ignored for team '${teamName}'`);
        continue;
      }
      if (!isFilled(rowData[header])) {
        continue;
      }
      // Get the value and parse it appropriately
      let val = rowData[header];
      
      // Handle hardCopy field validation
      if (dbField === 'accountsDept.hardCopy') {
        if (val) {
          const hardCopyValue = String(val).trim().toUpperCase();
          if (hardCopyValue !== 'YES' && hardCopyValue !== 'NO') {
            continue;
          }
          val = hardCopyValue;
        }
      }
      
      // Handle date fields
      if (dbField.includes('.date') || dbField.includes('Dt')) {
        val = parseDateIfNeeded(dbField, val);
      }
      // Handle numeric fields
      if (dbField.includes('.amount') || dbField.includes('Amt')) {
        val = parseNumberIfNeeded(dbField, val);
      }
      // Set the nested field in the update object
      const fieldParts = dbField.split('.');
      if (fieldParts.length === 2) {
        if (!updateObj[fieldParts[0]]) {
          updateObj[fieldParts[0]] = {};
        }
        updateObj[fieldParts[0]][fieldParts[1]] = val;
      } else {
        updateObj[dbField] = val;
      }
      // Track which fields are being updated
      if (!updateSummary[dbField]) {
        updateSummary[dbField] = 0;
      }
      updateSummary[dbField]++;
      hasUpdate = true;
      console.log(`[PATCH DEBUG] Field '${header}' (db: ${dbField}) will be updated with value:`, val);
    }

     if (updateObj.accountsDept && updateObj.accountsDept.paymentDate) {
      updateObj.accountsDept.status = 'Paid';
      console.log(`[PATCH DEBUG] Auto-setting accountsDept.status to 'Paid' for bill ${srNo} due to paymentDate update`);
    }

    // Only update if at least one allowed field is present (even if others are empty)
    if (hasUpdate) {
      await Bill.findByIdAndUpdate(bill._id, { $set: updateObj });
      updated++;
      console.log(`[PATCHED] Bill srNo ${srNo} updated fields:`, updateObj);
    } else {
      skipped++;
      console.log(`[PATCH DEBUG] Row ${rowNumber} skipped: no allowed fields to update.`);
    }
  }
  // Count total ignored field updates
  const totalIgnoredUpdates = Object.values(ignoredFieldsCount).reduce((sum, count) => sum + count, 0);

  console.log(`[PATCH SUMMARY] Updated: ${updated}, Skipped: ${skipped}, Ignored fields: ${Object.keys(ignoredFieldsCount).length}, Ignored updates: ${totalIgnoredUpdates}`);

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

