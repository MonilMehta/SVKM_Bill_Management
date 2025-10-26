import fs from 'fs';
import ExcelJS from 'exceljs';
import os from 'os';
import path from 'path';
import mongoose from "mongoose";
import Bill from "../models/bill-model.js";  // Add this import
import RegionMaster from "../models/region-master-model.js";
import CurrencyMaster from "../models/currency-master-model.js";
import NatureOfWorkMaster from "../models/nature-of-work-master-model.js";
import VendorMaster from "../models/vendor-master-model.js";
import PanStatusMaster from "../models/pan-status-master-model.js";
import ComplianceMaster from "../models/compliance-master-model.js"; // Add this import

// Complete fields array matching Excel columns
export const fields = [
    "srNo",
    "srNoOld",
    "typeOfInv",
    "region",
    "projectDescription",
    "vendorNo",
    "vendorName",
    "gstNumber",
    "compliance206AB",
    "panStatus",
    "poCreated",
    "poNo",
    "poDate",
    "poAmt",
    "proformaInvNo",
    "proformaInvDate",
    "proformaInvAmt",
    "proformaInvRecdAtSite",
    "proformaInvRecdBy",
    "taxInvNo",
    "taxInvDate",
    "currency",
    "taxInvAmt",
    "taxInvRecdAtSite",
    "taxInvRecdBy",
    "department",
    "remarksBySiteTeam",
    "attachment",
    "attachmentType",
    "advanceDate",
    "advanceAmt",
    "advancePercentage",
    "advRequestEnteredBy",
    "qualityEngineer.dateGiven",
    "qualityEngineer.name",
    "qsInspection.dateGiven",
    "qsInspection.name",
    "qsMeasurementCheck.dateGiven",
    "vendorFinalInv.dateGiven",
    "qsCOP.dateGiven",
    "qsCOP.name",
    "copDetails.date",
    "copDetails.amount",
    "remarksByQSTeam",
    "migoDetails.dateGiven",
    "migoDetails.no",
    "migoDetails.date",
    "migoDetails.amount",
    "migoDetails.doneBy",
    "invReturnedToSite",
    "siteEngineer.dateGiven",
    "siteEngineer.name",
    "architect.dateGiven",
    "architect.name",
    "siteIncharge.dateGiven",
    "siteIncharge.name",
    "remarks",
    "siteOfficeDispatch.dateGiven",
    "siteOfficeDispatch.name",
    "status",
    "pimoMumbai.dateGiven",
    "pimoMumbai.dateReceived",
    "pimoMumbai.receivedBy",
    "qsMumbai.dateGiven",
    "qsMumbai.name",
    "pimoMumbai.dateGivenPIMO",
    "pimoMumbai.namePIMO",
    "itDept.dateGiven",
    "itDept.name",
    "pimoMumbai.dateGivenPIMO2",
    "pimoMumbai.namePIMO2",
    "sesDetails.no",
    "sesDetails.amount",
    "sesDetails.date",
    "sesDetails.doneBy",
    "pimoMumbai.dateReceivedFromPIMO",
    "approvalDetails.directorApproval.dateGiven",
    "approvalDetails.directorApproval.dateReceived",
    "approvalDetails.remarksPimoMumbai",
    "accountsDept.dateGiven",
    "accountsDept.givenBy",
    "accountsDept.dateReceived",
    "accountsDept.receivedBy",
    "accountsDept.returnedToPimo",
    "accountsDept.receivedBack",
    "accountsDept.invBookingChecking",
    "accountsDept.paymentInstructions",
    "accountsDept.remarksForPayInstructions",
    "accountsDept.f110Identification",
    "accountsDept.paymentDate",
    "accountsDept.hardCopy",
    "accountsDept.accountsIdentification",
    "accountsDept.paymentAmt",
    "accountsDept.remarksAcctsDept",
    "accountsDept.status"
];

// Helper: flatten nested objects (using dot notation)
export const flattenDoc = (doc, path = '') => {
  let res = {};
  for (let key in doc) {
    const newPath = path ? `${path}.${key}` : key;
    if (typeof doc[key] === 'object' && doc[key] !== null && !(doc[key] instanceof Date)) {
      Object.assign(res, flattenDoc(doc[key], newPath));
    } else {
      res[newPath] = doc[key];
    }
  }
  return res;
};

// Helper: parse dates in various formats
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // If already a Date object, return it
  if (dateString instanceof Date) {
    return dateString;
  }
  
  try {
    // Convert to string if not already
    const strDate = String(dateString).trim();
    
    // Handle dot-separated format (DD.MM.YYYY) - convert to dash format
    const dotRegex = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
    const dotMatch = strDate.match(dotRegex);
    
    if (dotMatch) {
      const [_, day, month, year] = dotMatch;
      const dayInt = parseInt(day, 10);
      const monthInt = parseInt(month, 10) - 1;
      const yearInt = parseInt(year, 10);
      
      const date = new Date(yearInt, monthInt, dayInt, 12, 0, 0);
      if (!isNaN(date.getTime()) && 
          date.getDate() === dayInt && 
          date.getMonth() === monthInt && 
          date.getFullYear() === yearInt) {
        return date;
      }
    }
    
    // Handle Excel date format (DD-MM-YYYY)
    const ddmmyyyyRegex = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
    const ddmmyyyyMatch = strDate.match(ddmmyyyyRegex);
    
    if (ddmmyyyyMatch) {
      const [_, day, month, year] = ddmmyyyyMatch;
      
      // Ensure we're treating these as integers
      const dayInt = parseInt(day, 10);
      const monthInt = parseInt(month, 10) - 1; // Month is 0-indexed in JavaScript Date
      const yearInt = parseInt(year, 10);
      
      // Create date with noon time to avoid timezone issues
      const date = new Date(yearInt, monthInt, dayInt, 12, 0, 0);
      if (!isNaN(date.getTime()) && 
          date.getDate() === dayInt && 
          date.getMonth() === monthInt && 
          date.getFullYear() === yearInt) {
        return date;
      } else {
        // Date creation failed
      }
    }
    
    // Handle slash-separated format (DD/MM/YYYY)
    const ddmmyyyySlashRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const ddmmyyyySlashMatch = strDate.match(ddmmyyyySlashRegex);
    
    if (ddmmyyyySlashMatch) {
      const [_, day, month, year] = ddmmyyyySlashMatch;
      const dayInt = parseInt(day, 10);
      const monthInt = parseInt(month, 10) - 1;
      const yearInt = parseInt(year, 10);
      
      // Create date with noon time to avoid timezone issues
      const date = new Date(yearInt, monthInt, dayInt, 12, 0, 0);
      if (!isNaN(date.getTime()) &&
          date.getDate() === dayInt && 
          date.getMonth() === monthInt && 
          date.getFullYear() === yearInt) {
        return date;
      }
    }
    
    // Try to parse with built-in Date parser - this will interpret as MM/DD/YYYY for ambiguous formats
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // As a last resort for DD-MM-YYYY format, try manual parsing
    if (strDate.includes('-')) {
      const parts = strDate.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        
        // Handle 2-digit years
        const adjustedYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
        
        const manualDate = new Date(adjustedYear, month, day, 12, 0, 0);
        if (!isNaN(manualDate.getTime())) {
          return manualDate;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error parsing date '${dateString}':`, error);
    return null;
  }
};

// Helper: convert amount strings to numbers
export const parseAmount = (value) => {
  if (!value) return 0;
  // Remove currency symbols, commas and spaces
  const cleaned = value.toString().replace(/[₹,$€¥\s,]/g, '').trim();
  return parseFloat(cleaned) || 0;
};

// Helper function to organize QS fields properly
export const organizeQSFields = (data) => {
  // Check if we have QS-related fields that need to be organized
  const qsFieldMappings = {
    "Dt given to QS for Inspection": { target: "qsInspection", property: "dateGiven" },
    "Name of QS": { target: "qsInspection", property: "name" }, // This maps to qsInspection.name
    "Checked  by QS with Dt of Measurment": { target: "qsMeasurementCheck", property: "dateGiven" },
    "Given to vendor-Query/Final Inv": { target: "vendorFinalInv", property: "dateGiven" },
    "Dt given to QS for COP": { target: "qsCOP", property: "dateGiven" }, // Correctly maps to qsCOP.dateGiven
    "Name - QS": { target: "qsCOP", property: "name" } // This maps to qsCOP.name
  };
  
  // Initialize the target objects if not already present
  data.qsInspection = data.qsInspection || {};
  data.qsMeasurementCheck = data.qsMeasurementCheck || {};
  data.vendorFinalInv = data.vendorFinalInv || {};
  data.qsCOP = data.qsCOP || {};
  
  // Process each mapping
  Object.entries(qsFieldMappings).forEach(([sourceField, mapping]) => {
    if (sourceField in data) {
      // If the source field exists, map it to the target field
      if (!data[mapping.target]) {
        data[mapping.target] = {};
      }
      
      // Only set if value is not empty
      if (data[sourceField] !== null && data[sourceField] !== undefined && data[sourceField] !== '') {
        data[mapping.target][mapping.property] = data[sourceField];
      }
      
      // Remove the original field to avoid duplication
      delete data[sourceField];
    }
  });
  
  // Add some logic to make sure vendor data is stored properly in vendorFinalInv
  if (data.vendorFinalInv && data.vendorFinalInv.dateGiven && !data.vendorFinalInv.name) {
    // If we have a date but no name, try to use the QS name
    if (data.qsInspection && data.qsInspection.name) {
      data.vendorFinalInv.name = data.qsInspection.name;
    } else if (data.qsCOP && data.qsCOP.name) {
      data.vendorFinalInv.name = data.qsCOP.name;
    }
  }
  
  return data;
};

// Helper: convert strings to appropriate types
export const convertTypes = (data) => {
  // Create a deep copy of the data
  let result = JSON.parse(JSON.stringify(data));
  
  // Organize Quality Surveyor (QS) related fields
  organizeQSFields(result);
  
  // Currency formatting
  if (result.amount && typeof result.amount === 'string') {
    result.amount = parseAmount(result.amount);
  }
  
  if (result.poAmt && typeof result.poAmt === 'string') {
    result.poAmt = parseAmount(result.poAmt);
  }
  
  if (result.proformaInvAmt && typeof result.proformaInvAmt === 'string') {
    result.proformaInvAmt = parseAmount(result.proformaInvAmt);
  }
  
  if (result.taxInvAmt && typeof result.taxInvAmt === 'string') {
    result.taxInvAmt = parseAmount(result.taxInvAmt);
  }
  
  // Store the original "Type of inv" value if it exists, before it's potentially replaced by an ID
  if (data.typeOfInv) { // 'data' here refers to the original rowData passed to convertTypes
    result.originalTypeOfInv = data.typeOfInv;
  }

  if (result.advanceAmt && typeof result.advanceAmt === 'string') {
    result.advanceAmt = parseAmount(result.advanceAmt);
  }
  
  // Handle compliance206AB as an object reference, not a string
  if (result.compliance206AB && typeof result.compliance206AB === 'string') {
    // Keep as string for now, we'll convert to ObjectId in validateRequiredFields
  }
  
  // Parse basic date fields
  if (result.billDate && typeof result.billDate === 'string') {
    result.billDate = parseDate(result.billDate);
  }
  
  if (result.poDate && typeof result.poDate === 'string') {
    result.poDate = parseDate(result.poDate);
  }
  
  if (result.proformaInvDate && typeof result.proformaInvDate === 'string') {
    result.proformaInvDate = parseDate(result.proformaInvDate);
  }
  
  if (result.proformaInvRecdAtSite && typeof result.proformaInvRecdAtSite === 'string') {
    result.proformaInvRecdAtSite = parseDate(result.proformaInvRecdAtSite);
  }
  
  if (result.taxInvDate && typeof result.taxInvDate === 'string') {
    result.taxInvDate = parseDate(result.taxInvDate);
  }
  
  if (result.taxInvRecdAtSite && typeof result.taxInvRecdAtSite === 'string') {
    result.taxInvRecdAtSite = parseDate(result.taxInvRecdAtSite);
  }
  
  if (result.advanceDate && typeof result.advanceDate === 'string') {
    result.advanceDate = parseDate(result.advanceDate);
  }
  
  // Parse dates in nested objects if they exist
  // This handles fields after we've organized QS fields
  if (result.copDetails && result.copDetails.date && typeof result.copDetails.date === 'string') {
    result.copDetails.date = parseDate(result.copDetails.date);
  }
  
  if (result.migoDetails) {
    if (result.migoDetails.date && typeof result.migoDetails.date === 'string') {
      result.migoDetails.date = parseDate(result.migoDetails.date);
    }
    if (result.migoDetails.dateGiven && typeof result.migoDetails.dateGiven === 'string') {
      result.migoDetails.dateGiven = parseDate(result.migoDetails.dateGiven);
    }
    if (result.migoDetails.amount && typeof result.migoDetails.amount === 'string') {
      result.migoDetails.amount = parseAmount(result.migoDetails.amount);
    }
  }
  
  if (result.invReturnedToSite && typeof result.invReturnedToSite === 'string') {
    result.invReturnedToSite = parseDate(result.invReturnedToSite);
  }
  
  // Handle nested date fields in objects
  const nestedDateObjects = [
    'qualityEngineer', 'qsInspection', 'qsMeasurementCheck', 'vendorFinalInv', 
    'qsCOP', 'siteEngineer', 'architect', 'siteIncharge', 'siteOfficeDispatch',
    'qsMumbai', 'pimoMumbai', 'itDept'
  ];
  
  nestedDateObjects.forEach(obj => {
    if (result[obj]) {
      if (result[obj].dateGiven && typeof result[obj].dateGiven === 'string') {
        result[obj].dateGiven = parseDate(result[obj].dateGiven);
      }
      if (result[obj].dateReceived && typeof result[obj].dateReceived === 'string') {
        result[obj].dateReceived = parseDate(result[obj].dateReceived);
      }
    }
  });
  
  // Special handling for PIMO Mumbai fields
  if (result.pimoMumbai) {
    if (result.pimoMumbai.dateGivenPIMO && typeof result.pimoMumbai.dateGivenPIMO === 'string') {
      result.pimoMumbai.dateGivenPIMO = parseDate(result.pimoMumbai.dateGivenPIMO);
    }
    if (result.pimoMumbai.dateGivenPIMO2 && typeof result.pimoMumbai.dateGivenPIMO2 === 'string') {
      result.pimoMumbai.dateGivenPIMO2 = parseDate(result.pimoMumbai.dateGivenPIMO2);
    }
    if (result.pimoMumbai.dateReceivedFromIT && typeof result.pimoMumbai.dateReceivedFromIT === 'string') {
      result.pimoMumbai.dateReceivedFromIT = parseDate(result.pimoMumbai.dateReceivedFromIT);
    }
    if (result.pimoMumbai.dateReceivedFromPIMO && typeof result.pimoMumbai.dateReceivedFromPIMO === 'string') {
      result.pimoMumbai.dateReceivedFromPIMO = parseDate(result.pimoMumbai.dateReceivedFromPIMO);
    }
  }
  
  // Handle SES details
  if (result.sesDetails) {
    if (result.sesDetails.date && typeof result.sesDetails.date === 'string') {
      result.sesDetails.date = parseDate(result.sesDetails.date);
    }
    if (result.sesDetails.amount && typeof result.sesDetails.amount === 'string') {
      result.sesDetails.amount = parseAmount(result.sesDetails.amount);
    }
  }
  
  // Handle approval details
  if (result.approvalDetails && result.approvalDetails.directorApproval) {
    if (result.approvalDetails.directorApproval.dateGiven && 
        typeof result.approvalDetails.directorApproval.dateGiven === 'string') {
      result.approvalDetails.directorApproval.dateGiven = 
        parseDate(result.approvalDetails.directorApproval.dateGiven);
    }
    if (result.approvalDetails.directorApproval.dateReceived && 
        typeof result.approvalDetails.directorApproval.dateReceived === 'string') {
      result.approvalDetails.directorApproval.dateReceived = 
        parseDate(result.approvalDetails.directorApproval.dateReceived);
    }
  }
  
  // Handle accounts department - ensure all date fields are properly parsed
  if (result.accountsDept) {
    // Explicitly parse all date fields in accountsDept
    const accountsDateFields = [
      'dateGiven', 'dateReceived', 'returnedToPimo', 'receivedBack', 
      'paymentDate', 'invBookingChecking'
    ];
    
    accountsDateFields.forEach(dateField => {
      if (result.accountsDept[dateField] && typeof result.accountsDept[dateField] === 'string') {
        try {
          // Special handling for the problematic returnedToPimo field
          if (dateField === 'returnedToPimo') {
            // Try direct parsing first
            let parsedDate = parseDate(result.accountsDept[dateField]);
            
            // If parsing failed, try additional format handling
            if (!parsedDate) {
              const dateParts = result.accountsDept[dateField].split('-');
              if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(parsedDate.getTime())) {
                  // Successfully parsed manually
                }
              }
            }
            
            result.accountsDept[dateField] = parsedDate;
          } else {
            // Normal parsing for other date fields
            result.accountsDept[dateField] = parseDate(result.accountsDept[dateField]);
          }
        } catch (error) {
          console.error(`Error parsing accountsDept.${dateField}:`, error);
          // Set to null to avoid validation error
          result.accountsDept[dateField] = null;
        }
      }
    });
    
    // Handle payment amount
    if (result.accountsDept.paymentAmt && typeof result.accountsDept.paymentAmt === 'string') {
      result.accountsDept.paymentAmt = parseAmount(result.accountsDept.paymentAmt);
    }
  }
  
  return result;
};

// Helper: create a temporary file path
export const createTempFilePath = (prefix, extension) => {
  const tempDir = os.tmpdir();
  const fileName = `${prefix}-${Date.now()}.${extension}`;
  return path.join(tempDir, fileName);
};

// Helper: convert Excel serial number to new format with full financial year
export const convertExcelSrNo = (excelSrNo) => {
  if (!excelSrNo) return null;
  
  const srNoStr = String(excelSrNo).trim();
  
  // Check if the srNo already has the correct format (starts with 25)
  if (srNoStr.startsWith('25')) {
    return srNoStr;
  }
  
  // New financial year is 25-26, so prefix should be 25
  // Extract the numeric part and ignore any existing prefix
  const numericPart = srNoStr.replace(/\D/g, '');
  
  // Create the new serial number with 25 prefix and padded numeric part
  const result = `25${numericPart.padStart(5, '0')}`;
  
  return result;
};

// Helper function to find next available serial number
export const findNextAvailableSrNo = async (basePrefix, baseNumber) => {
  // Use the new financial year prefix 25 instead of the provided prefix
  const prefix = '25';
  
  // Find the highest existing srNo with the 25 prefix
  const latestBill = await Bill.findOne({
    srNo: { $regex: `^${prefix}` }
  }).sort({ srNo: -1 });
  
  let nextNumber = baseNumber;
  
  if (latestBill) {
    // Extract the numeric part from the latest srNo
    const latestSrNo = latestBill.srNo;
    const restPart = parseInt(latestSrNo.substring(prefix.length), 10);
    
    // Use whichever is higher - our base number or the latest + 1
    nextNumber = Math.max(baseNumber, restPart + 1);
  }
  
  // Format to have leading zeros
  const paddedNumber = String(nextNumber).padStart(5, '0');
  return `${prefix}${paddedNumber}`;
};

// Add validation function for required fields with defaults
export const validateRequiredFields = async (data) => {
  const requiredFields = [
    'typeOfInv',
    'projectDescription',
    'vendorNo',
    'vendorName',
    'gstNumber',
    'compliance206AB',
    'poCreated',
    'billDate',
    'amount',
    'taxInvRecdAtSite',
    'taxInvRecdBy',
    'department'
  ];

  // Apply defaults and validations
  const defaults = {
    typeOfInv: "Others",
    projectDescription: "NA",
    vendorNo: "DEFAULT001",
    vendorName: "Default Vendor",
    gstNumber: "NOTPROVIDED",
    compliance206AB: "206AB check on website",
    poCreated: "No",
    billDate: new Date().toISOString().split('T')[0],
    amount: 0,
    department: "DEFAULT",
    taxInvRecdAtSite: new Date(),
    taxInvRecdBy: "SYSTEM",
    attachmentType: "Others",
    siteStatus: "hold"
  };

  // Apply defaults for missing fields
  Object.keys(defaults).forEach(key => {
    if (!data[key] || data[key] === '') {
      data[key] = defaults[key];
    }
  });

  // Always ensure vendor field is present with a valid ObjectId
  if (!data.vendor || !mongoose.Types.ObjectId.isValid(data.vendor)) {
    try {
      // Try to find a vendor based on vendorName or vendorNo
      let vendorDoc = null;
      if (data.vendorName) {
        vendorDoc = await VendorMaster.findOne({
          vendorName: { $regex: new RegExp(data.vendorName, 'i') }
        });
      }
      
      if (!vendorDoc && data.vendorNo) {
        vendorDoc = await VendorMaster.findOne({ vendorNo: data.vendorNo });
      }
      
      if (vendorDoc) {
        data.vendor = vendorDoc._id;
      } else {
        // If no vendor found, create a placeholder ObjectId
        data.vendor = new mongoose.Types.ObjectId();
      }
    } catch (error) {
      console.error('Error finding vendor:', error);
      data.vendor = new mongoose.Types.ObjectId();
    }
  }

  // Handle compliance206AB reference
  try {
    if (data.compliance206AB) {
      // Try to find the compliance entry by name (case-insensitive)
      const complianceDoc = await ComplianceMaster.findOne({
        compliance206AB: { $regex: new RegExp(data.compliance206AB, 'i') }
      });
      
      if (complianceDoc) {
        // Replace the string with a reference to the ComplianceMaster document
        data.compliance206AB = complianceDoc._id;
      } else {
        // If not found, try to find any as default
        const defaultCompliance = await ComplianceMaster.findOne();
        if (defaultCompliance) {
          data.compliance206AB = defaultCompliance._id;
        } else {
          // Last resort - create a placeholder ObjectId
          data.compliance206AB = new mongoose.Types.ObjectId();
        }
      }
    } else {
      // If not specified, try to find any as default
      const defaultCompliance = await ComplianceMaster.findOne();
      if (defaultCompliance) {
        data.compliance206AB = defaultCompliance._id;
      } else {
        data.compliance206AB = new mongoose.Types.ObjectId();
      }
    }
  } catch (error) {
    console.error('Error setting compliance206AB:', error);
    data.compliance206AB = new mongoose.Types.ObjectId();
  }
  
  // Validate amount is a number
  data.amount = parseFloat(data.amount) || 0;

  // Handle currency reference
  try {
    if (data.currency) {
      const currencyDoc = await CurrencyMaster.findOne({
        currency: { $regex: new RegExp(data.currency, 'i') }
      });
      
      if (currencyDoc) {
        data.currency = currencyDoc._id;
      } else {
        // Try to find default INR currency
        const inrCurrency = await CurrencyMaster.findOne({
          currency: { $regex: /inr/i }
        });
        
        if (inrCurrency) {
          data.currency = inrCurrency._id;
        } else {
          // Create a placeholder but this should be unlikely
          const defaultCurrency = await CurrencyMaster.findOne();
          data.currency = defaultCurrency ? defaultCurrency._id : new mongoose.Types.ObjectId();
        }
      }
    } else {
      // If no currency specified, try to find INR as default
      const defaultCurrency = await CurrencyMaster.findOne({
        currency: { $regex: /inr/i }
      }) || await CurrencyMaster.findOne();
      
      if (defaultCurrency) {
        data.currency = defaultCurrency._id;
      } else {
        // Last resort - create a placeholder ObjectId
        data.currency = new mongoose.Types.ObjectId();
      }
    }
  } catch (error) {
    console.error('Error setting currency:', error);
    data.currency = new mongoose.Types.ObjectId();
  }

  // Handle region reference
  try {
    if (data.region) {
      const normalizedInput = data.region.trim();
      // Try to find the region in RegionMaster (case-insensitive)
      const regionDoc = await RegionMaster.findOne({ 
        name: { $regex: `^${normalizedInput}$`, $options: "i" } 
      });
      
      if (regionDoc) {
        data.region = regionDoc.name;
      } else {
        // If region not found, set to null to indicate validation failure
        data.region = null;
      }
    } else {
      // If no region specified, set to null to indicate validation failure
      data.region = null;
    }
  } catch (error) {
    console.error('Error setting region:', error);
    data.region = null;
  }

  // Handle natureOfWork reference
  try {
    if (data.natureOfWork && mongoose.Types.ObjectId.isValid(data.natureOfWork)) {
      // Already a valid ObjectId, do nothing
    } else if (data.typeOfInv || data.natureOfWork) {
      const workType = (data.natureOfWork || data.typeOfInv).trim();
      const workTypeLower = workType.toLowerCase();
      
      // Try exact match first (case-insensitive)
      let workDoc = await NatureOfWorkMaster.findOne({ 
        natureOfWork: { $regex: `^${workType}$`, $options: 'i' } 
      });
      
      // Try partial match (contains)
      if (!workDoc) {
        workDoc = await NatureOfWorkMaster.findOne({ 
          natureOfWork: { $regex: workType, $options: 'i' } 
        });
      }
      
      // Try reverse partial match (workType contains nature name)
      if (!workDoc) {
        const allNatures = await NatureOfWorkMaster.find();
        workDoc = allNatures.find(n => 
          workTypeLower.includes(n.natureOfWork.toLowerCase())
        );
      }
      
      // Try fuzzy matching with word splitting
      if (!workDoc) {
        const typeWords = workTypeLower.split(/\s+/).filter(w => w.length > 3);
        if (typeWords.length > 0) {
          const allNatures = await NatureOfWorkMaster.find();
          workDoc = allNatures.find(n => {
            const natureName = n.natureOfWork.toLowerCase();
            return typeWords.some(word => natureName.includes(word));
          });
        }
      }
      
      if (workDoc) {
        data.natureOfWork = workDoc._id;
      } else {
        // If not found, default to "Others"
        const defaultWork = await NatureOfWorkMaster.findOne({
          natureOfWork: { $regex: /^others$/i }
        }) || await NatureOfWorkMaster.findOne();
        
        data.natureOfWork = defaultWork ? defaultWork._id : new mongoose.Types.ObjectId();
      }
    } else {
      // If no type specified, find "Others" as default
      const defaultWork = await NatureOfWorkMaster.findOne({
        natureOfWork: { $regex: /others/i }
      }) || await NatureOfWorkMaster.findOne();
      
      data.natureOfWork = defaultWork ? defaultWork._id : new mongoose.Types.ObjectId();
    }
  } catch (error) {
    console.error('Error setting natureOfWork:', error);
    data.natureOfWork = new mongoose.Types.ObjectId();
  }

  // Ensure proper enum values for status
  if (data.status && !['accept', 'reject', 'hold', 'issue'].includes(data.status.toLowerCase())) {
    data.status = 'hold';
  }
  
  // Ensure proper enum values for siteStatus
  if (!data.siteStatus || !['accept', 'reject', 'hold', 'issue'].includes(data.siteStatus.toLowerCase())) {
    data.siteStatus = 'hold';
  }

  // Ensure proper enum values for accountsDept.status
  if (data['accountsDept.status'] && 
      !['Paid', 'Unpaid'].includes(data['accountsDept.status'].toLowerCase())) {
    data['accountsDept.status'] = 'Unpaid';
  }

  // Convert Yes/No fields
  if (data.poCreated) {
    data.poCreated = data.poCreated.toLowerCase().includes('yes') ? 'Yes' : 'No';
  }

  // Fix amount mapping from taxInvAmt
  data.amount = parseAmount(data.taxInvAmt) || 0;

  // If payment date is set, auto-update payment status to Paid
  if (data['accountsDept.paymentDate'] && data['accountsDept.paymentDate'] !== '') {
    data['accountsDept.status'] = 'Paid';
  } else if (!data['accountsDept.status']) {
    // Default payment status is Unpaid
    data['accountsDept.status'] = 'Unpaid';
  }

  return data;
};


// Map to identify which "Name of QS" and "Status" field is which based on its position
export const contextBasedMapping = {
  // Maps a header to potential contextual fields around it
  "Dt given to QS for Inspection": { nextField: "Name of QS", mapping: "qsInspection.name" },
  "Given to vendor-Query/Final Inv": { nextField: "Name of QS", mapping: "vendorFinalInv.name" },
  "Dt given to QS for COP": { nextField: "Name - QS", mapping: "qsCOP.name" },
  "Name-Site Office": { nextField: "Status", mapping: "status" },
  "Dt given to QS Mumbai": { nextField: "Name of QS", mapping: "qsMumbai.name" },
  "Dt of Payment": { nextField: "Status", mapping: "accountsDept.status" }
};

// Global serial number tracking for import sessions
export const serialNumberTracking = {
  lastPrefixUsed: null,
  lastNumberUsed: 0,
  usedSerialNumbers: new Set()
};

// Helper: generate a unique serial number based on financial year prefix
export async function generateUniqueSerialNumber(prefix) {
  // Always use the new financial year prefix 25
  const newPrefix = '25';
  
  // Check if we already initialized the counter for this prefix
  if (serialNumberTracking.lastPrefixUsed !== newPrefix) {
    // Find the highest existing srNo with the given prefix directly from database
    const latestBill = await Bill.findOne({
      srNo: { $regex: `^${newPrefix}` }
    }).sort({ srNo: -1 });
    
    if (latestBill && latestBill.srNo) {
      // Extract numeric part (after the prefix)
      const numericPart = parseInt(latestBill.srNo.substring(newPrefix.length), 10);
      serialNumberTracking.lastNumberUsed = numericPart;
    } else {
      // Start from 0 if no bills exist with this prefix
      serialNumberTracking.lastNumberUsed = 0;
    }
    
    serialNumberTracking.lastPrefixUsed = newPrefix;
    // Clear the used numbers set when switching to a new prefix
    serialNumberTracking.usedSerialNumbers.clear();
  }

  // Generate next number
  let nextNumber = serialNumberTracking.lastNumberUsed + 1;
  let serialNumber = `${newPrefix}${String(nextNumber).padStart(5, '0')}`;
  
  // Ensure it's not already used in this batch
  while (serialNumberTracking.usedSerialNumbers.has(serialNumber)) {
    nextNumber++;
    serialNumber = `${newPrefix}${String(nextNumber).padStart(5, '0')}`;
  }
  
  // Update tracking
  serialNumberTracking.lastNumberUsed = nextNumber;
  serialNumberTracking.usedSerialNumbers.add(serialNumber);
  
  return serialNumber;
}