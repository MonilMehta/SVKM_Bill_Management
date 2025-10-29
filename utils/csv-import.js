import ExcelJS from 'exceljs';
import Bill from "../models/bill-model.js";
import mongoose from "mongoose";
import PanStatusMaster from "../models/pan-status-master-model.js";
import CurrencyMaster from "../models/currency-master-model.js";
import RegionMaster from "../models/region-master-model.js";
import NatureOfWorkMaster from "../models/nature-of-work-master-model.js";
import VendorMaster from "../models/vendor-master-model.js";
import ComplianceMaster from "../models/compliance-master-model.js";
import { headerMapping } from './headerMap.js';
import { parseDate } from './csv-patch.js';

/**
 * Recursively sanitizes all amount fields in an object by removing commas and converting to numbers
 * @param {Object} obj - The object to sanitize
 */
function sanitizeAmounts(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      sanitizeAmounts(value);
    } else if ((key.toLowerCase().includes('amt') || key.toLowerCase().includes('amount')) && typeof value === 'string') {
      const num = parseFloat(value.replace(/,/g, ''));
      obj[key] = isNaN(num) ? 0 : num;
    }
  }
}

/**
 * Loads all master data collections from the database for reference lookups
 * @returns {Promise<Object>} Object containing vendors, regions, currencies, natureOfWork, panStatuses, and compliance arrays
 */
async function loadMasterData() {
  const [vendors, regions, currencies, natureOfWork, panStatuses, compliance] = await Promise.all([
    VendorMaster.find().lean(),
    RegionMaster.find().lean(),
    CurrencyMaster.find().lean(),
    NatureOfWorkMaster.find().lean(),
    PanStatusMaster.find().lean(),
    ComplianceMaster.find().lean()
  ]);
  
  return { vendors, regions, currencies, natureOfWork, panStatuses, compliance };
}

/**
 * Reads an Excel workbook and extracts headers from the first row
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Object>} Object containing worksheet and headers array
 * @throws {Error} If no worksheet is found in the Excel file
 */
async function readExcelWorkbook(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet(1);
  
  if (!worksheet) {
    throw new Error("No worksheet found in the Excel file");
  }
  
  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString().trim();
  });
  
  return { worksheet, headers };
}

/**
 * Extracts and transforms data from a single Excel row into bill data structure
 * @param {Object} row - ExcelJS row object
 * @param {Array<string>} headers - Array of header names
 * @param {number} rowNumber - Current row number for logging
 * @returns {Object} Object containing billData and srNo
 */
function extractRowData(row, headers, rowNumber) {
  const billData = {};
  let srNo = null;
  
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = headers[colNumber - 1];
    if (!header) return;
    
    const fieldName = headerMapping[header];
    if (!fieldName) return;
    
    let value = cell.value;
    
    if (cell.type === ExcelJS.ValueType.Date) {
      value = cell.value;
    } else if (typeof value === 'object' && value !== null) {
      value = value.text || value.result || value.toString();
    }
    
    if (fieldName?.toLowerCase().includes('date') && value) {
      value = parseDate(value);
      if (value instanceof Date && !isNaN(value.getTime())) {
        value = new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
      }
    }
    
    if (fieldName?.toLowerCase().includes('amt') && typeof value === 'string') {
      value = parseFloat(value.replace(/,/g, ''));
      if (isNaN(value)) value = 0;
    }
    
    if (fieldName === 'srNo') {
      srNo = String(value || '').trim();
    }
    
    if (fieldName.includes('.')) {
      const parts = fieldName.split('.');
      let current = billData;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      billData[fieldName] = value;
    }
  });
  
  sanitizeAmounts(billData);
  
  return { billData, srNo };
}

/**
 * Finds an existing bill by serial number
 * @param {string} srNo - Serial number to search for
 * @returns {Promise<Object|null>} The existing bill document or null
 */
async function findExistingBillBySrNo(srNo) {
  return await Bill.findOne({ 
    $or: [{ srNo }, { excelSrNo: srNo }] 
  }).lean();
}

/**
 * Checks for duplicate bills based on unique combination of vendor, invoice, date, and region
 * @param {Object} billData - Bill data to check for duplicates
 * @param {number} rowNumber - Current row number for logging
 * @returns {Promise<Object|null>} The duplicate bill document or null
 */
async function findDuplicateByUniqueness(billData, rowNumber) {
  if (!billData.vendorNo && !billData.taxInvNo && !billData.taxInvDate && !billData.region) {
    return null;
  }
  
  const uniquenessQuery = {};
  
  if (billData.vendorNo) uniquenessQuery.vendorNo = billData.vendorNo;
  if (billData.taxInvNo) uniquenessQuery.taxInvNo = billData.taxInvNo;
  if (billData.region) uniquenessQuery.region = billData.region;
  
  if (billData.taxInvDate) {
    const inputDate = new Date(billData.taxInvDate);
    const startOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate(), 0, 0, 0);
    const endOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate(), 23, 59, 59, 999);
    
    uniquenessQuery.taxInvDate = {
      $gte: startOfDay,
      $lte: endOfDay
    };
  }
  
  if (Object.keys(uniquenessQuery).length >= 2) {
    return await Bill.findOne(uniquenessQuery).lean();
  }
  
  return null;
}

/**
 * Maps master data references (vendor, region, currency, etc.) to their ObjectIds
 * @param {Object} billData - Bill data to map references for
 * @param {Object} masterData - Object containing all master data collections
 * @returns {Object} Bill data with mapped references
 */
function mapMasterReferences(billData, masterData) {
  const { vendors, regions, currencies, natureOfWork, panStatuses, compliance } = masterData;
  const mapped = { ...billData };
  
  if (mapped.vendorName || mapped.vendorNo) {
    const vendor = vendors.find(v => 
      v.vendorName?.toLowerCase().includes(mapped.vendorName?.toLowerCase()) ||
      v.vendorNo == mapped.vendorNo
    );
    if (vendor) mapped.vendor = vendor._id;
  }
  
  if (mapped.region) {
    const region = regions.find(r => 
      r.name?.toLowerCase() === mapped.region?.toLowerCase()
    );
    if (region) mapped.region = region.name;
  }
  
  if (mapped.currency) {
    const curr = currencies.find(c => 
      c.currency?.toLowerCase() === mapped.currency?.toLowerCase()
    );
    if (curr) mapped.currency = curr._id;
  }
  
  if (mapped.typeOfInv) {
    const nature = natureOfWork.find(n => 
      n.natureOfWork?.toLowerCase().includes(mapped.typeOfInv?.toLowerCase())
    );
    if (nature) mapped.natureOfWork = nature._id;
  }
  
  if (mapped.panStatus) {
    const pan = panStatuses.find(p => 
      p.name?.toLowerCase() === mapped.panStatus?.toLowerCase()
    );
    if (pan) mapped.panStatus = pan._id;
  }
  
  if (mapped.compliance206AB) {
    const comp = compliance.find(c => 
      c.compliance206AB?.toLowerCase().includes(mapped.compliance206AB?.toLowerCase())
    );
    if (comp) mapped.compliance206AB = comp._id;
  }
  
  return mapped;
}

/**
 * Updates an existing bill with new data
 * @param {Object} existingBill - The existing bill document
 * @param {Object} billData - New bill data to update with
 * @param {Object} masterData - Object containing all master data collections
 * @returns {Promise<string>} The updated bill's ID
 */
async function updateExistingBill(existingBill, billData, masterData) {
  const updateData = mapMasterReferences(billData, masterData);
  await Bill.findByIdAndUpdate(existingBill._id, updateData);
  return existingBill._id;
}

/**
 * Finds nature of work using fuzzy matching algorithm
 * @param {string} typeOfInv - Type of invoice to match
 * @param {Array<Object>} natureOfWorkList - List of nature of work documents
 * @returns {Object|null} Matched nature of work document or null
 */
function findNatureOfWork(typeOfInv, natureOfWorkList) {
  if (!typeOfInv) return null;
  
  const typeOfInv_lower = typeOfInv.toLowerCase().trim();
  
  let nature = natureOfWorkList.find(n => 
    n.natureOfWork?.toLowerCase() === typeOfInv_lower
  );
  
  if (!nature) {
    nature = natureOfWorkList.find(n => {
      const natureName = n.natureOfWork?.toLowerCase();
      return natureName?.includes(typeOfInv_lower) || typeOfInv_lower.includes(natureName);
    });
  }
  
  if (!nature) {
    const typeWords = typeOfInv_lower.split(/\s+/);
    nature = natureOfWorkList.find(n => {
      const natureName = n.natureOfWork?.toLowerCase();
      return typeWords.some(word => word.length > 3 && natureName?.includes(word));
    });
  }
  
  if (!nature) {
    nature = natureOfWorkList.find(n => n.natureOfWork?.toLowerCase() === "others") || natureOfWorkList[0];
  }
  
  return nature;
}

/**
 * Creates a new bill with all required fields and default values
 * @param {Object} billData - Bill data extracted from Excel
 * @param {Object} masterData - Object containing all master data collections
 * @returns {Promise<string>} The created bill's ID
 */
async function createNewBill(billData, masterData) {
  const { vendors, regions, currencies, natureOfWork, panStatuses, compliance } = masterData;
  const newBillData = { ...billData };
  
  newBillData.billDate = newBillData.taxInvDate || new Date();
  newBillData.amount = newBillData.taxInvAmt || 0;
  newBillData.siteStatus = "hold";
  newBillData.department = newBillData.department || "DEFAULT DEPT";
  newBillData.taxInvRecdBy = newBillData.taxInvRecdBy || "SYSTEM IMPORT";
  newBillData.taxInvRecdAtSite = newBillData.taxInvRecdAtSite || new Date();
  newBillData.projectDescription = newBillData.projectDescription || "N/A";
  newBillData.poCreated = newBillData.poCreated || "No";
  newBillData.vendorName = newBillData.vendorName || "Unknown Vendor";
  newBillData.vendorNo = newBillData.vendorNo || "Unknown";
  
  if (newBillData.vendorName || newBillData.vendorNo) {
    const vendor = vendors.find(v => 
      v.vendorName?.toLowerCase().includes(newBillData.vendorName?.toLowerCase()) ||
      v.vendorNo == newBillData.vendorNo
    );
    newBillData.vendor = vendor ? vendor._id : new mongoose.Types.ObjectId();
  } else {
    newBillData.vendor = new mongoose.Types.ObjectId();
  }
  
  const region = regions.find(r => 
    r.name?.toLowerCase() === newBillData.region?.toLowerCase()
  ) || regions[0];
  newBillData.region = region ? region.name : "DEFAULT";
  
  const currency = currencies.find(c => 
    c.currency?.toLowerCase() === newBillData.currency?.toLowerCase()
  ) || currencies.find(c => c.currency?.toLowerCase() === "inr") || currencies[0];
  newBillData.currency = currency ? currency._id : new mongoose.Types.ObjectId();
  
  const nature = findNatureOfWork(newBillData.typeOfInv, natureOfWork);
  newBillData.natureOfWork = nature ? nature._id : new mongoose.Types.ObjectId();
  
  if (newBillData.panStatus) {
    const pan = panStatuses.find(p => 
      p.name?.toLowerCase() === newBillData.panStatus?.toLowerCase()
    );
    if (pan) newBillData.panStatus = pan._id;
  }
  
  if (newBillData.compliance206AB) {
    const comp = compliance.find(c => 
      c.compliance206AB?.toLowerCase().includes(newBillData.compliance206AB?.toLowerCase())
    );
    if (comp) newBillData.compliance206AB = comp._id;
  }
  
  newBillData._importMode = true;
  
  const newBill = new Bill(newBillData);
  await newBill.save();
  return newBill._id;
}

/**
 * Formats import results into a user-friendly response object
 * @param {Object} results - Raw results object containing toInsert, toUpdate, skipped, and errors arrays
 * @returns {Object} Formatted results with message and counts
 */
function formatImportResults(results) {
  let message = '';
  const totalProcessed = results.toInsert.length + results.toUpdate.length + results.skipped;
  
  if (results.toInsert.length > 0 && results.toUpdate.length > 0) {
    message = `Successfully imported ${results.toInsert.length} new bills and updated ${results.toUpdate.length} existing bills`;
  } else if (results.toInsert.length > 0) {
    message = `Successfully imported ${results.toInsert.length} new bill${results.toInsert.length === 1 ? '' : 's'}`;
  } else if (results.toUpdate.length > 0) {
    message = `Successfully updated ${results.toUpdate.length} existing bill${results.toUpdate.length === 1 ? '' : 's'}`;
  } else if (results.skipped > 0) {
    message = `All ${results.skipped} bills already exist in the database`;
  } else {
    message = 'No bills were processed from the Excel file';
  }
  
  if (results.errors.length > 0) {
    message += `. ${results.errors.length} row${results.errors.length === 1 ? '' : 's'} had errors and were skipped`;
  }
  
  return {
    inserted: results.toInsert.length,
    updated: results.toUpdate.length,
    skipped: results.skipped,
    errors: results.errors.length,
    message: message,
    totalProcessed: totalProcessed,
    details: results
  };
}

/**
 * Imports bills from an Excel file into the database
 * @param {string} filePath - Path to the Excel file
 * @param {Array<string>} validVendorNos - Array of valid vendor numbers (currently unused)
 * @param {boolean} patchOnly - If true, only updates existing bills; if false, inserts new bills
 * @returns {Promise<Object>} Object containing import statistics and results
 * @throws {Error} If Excel file cannot be read or processed
 */
export const importBillsFromExcel = async (filePath, validVendorNos = [], patchOnly = false) => {
  try {
    const masterData = await loadMasterData();
    const { worksheet, headers } = await readExcelWorkbook(filePath);
    
    const results = {
      toInsert: [],
      toUpdate: [],
      skipped: 0,
      errors: []
    };
    
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      if (!row.getCell(1).value) continue;
      
      try {
        const { billData, srNo } = extractRowData(row, headers, rowNumber);
        
        if (!srNo) continue;
        
        const existingBill = await findExistingBillBySrNo(srNo);
        const duplicateByUniqueness = await findDuplicateByUniqueness(billData, rowNumber);
        
        if (existingBill || duplicateByUniqueness) {
          if (patchOnly) {
            const billToUpdate = existingBill || duplicateByUniqueness;
            const updatedId = await updateExistingBill(billToUpdate, billData, masterData);
            results.toUpdate.push(updatedId);
          } else {
            results.skipped++;
          }
        } else if (!patchOnly) {
          billData.srNo = srNo;
          billData.excelSrNo = srNo;
          const newBillId = await createNewBill(billData, masterData);
          results.toInsert.push(newBillId);
        }
        
      } catch (error) {
        let errorMessage = error.message;
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = `Duplicate bill found - this combination of vendor, invoice number, date, and region already exists`;
        }
        
        results.errors.push({
          row: rowNumber,
          error: errorMessage,
          srNo: undefined
        });
      }
    }
    
    return formatImportResults(results);
    
  } catch (error) {
    throw error;
  }
};

