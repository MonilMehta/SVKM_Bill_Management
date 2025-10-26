// Recursively sanitize all amount fields in an object
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
import ExcelJS from 'exceljs';
import Bill from "../models/bill-model.js";
import mongoose from "mongoose";
import PanStatusMaster from "../models/pan-status-master-model.js";
import CurrencyMaster from "../models/currency-master-model.js";
import RegionMaster from "../models/region-master-model.js";
import NatureOfWorkMaster from "../models/nature-of-work-master-model.js";
import VendorMaster from "../models/vendor-master-model.js";
import ComplianceMaster from "../models/compliance-master-model.js";

// Import helper functions
import { headerMapping } from './headerMap.js';
import { parseDate } from './csv-patch.js';

// Main Excel import function
export const importBillsFromExcel = async (filePath, validVendorNos = [], patchOnly = false) => {
  try {
    console.log('Starting Excel import...');
    
    // Load master data for reference lookups
    const [vendors, regions, currencies, natureOfWork, panStatuses, compliance] = await Promise.all([
      VendorMaster.find().lean(),
      RegionMaster.find().lean(),
      CurrencyMaster.find().lean(),
      NatureOfWorkMaster.find().lean(),
      PanStatusMaster.find().lean(),
      ComplianceMaster.find().lean()
    ]);
    
    console.log(`Loaded master data: ${vendors.length} vendors, ${regions.length} regions, ${currencies.length} currencies, ${natureOfWork.length} nature of work, ${panStatuses.length} pan statuses, ${compliance.length} compliance`);
    
    // Load Excel workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error("No worksheet found in the Excel file");
    }
    
    // Get headers from first row
    const headers = [];
    worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString().trim();
    });
    
 
    
    const results = {
      toInsert: [],
      toUpdate: [],
      skipped: 0,
      errors: []
    };
    
    // Process each data row
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // Skip empty rows
      if (!row.getCell(1).value) continue;
      
      try {
        const billData = {};
        let srNo = null;
        
        // Extract data from each cell using header mapping
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (!header) return;
          
          const fieldName = headerMapping[header];
          if (!fieldName) return;
          
          let value = cell.value;
          
          // Handle different cell types
          if (cell.type === ExcelJS.ValueType.Date) {
            value = cell.value;
          } else if (typeof value === 'object' && value !== null) {
            value = value.text || value.result || value.toString();
          }
          
          // Convert dates and normalize them to start of day
          if (fieldName?.toLowerCase().includes('date') && value) {
            value = parseDate(value);
            // Normalize date to start of day to ensure consistent storage
            if (value instanceof Date && !isNaN(value.getTime())) {
              value = new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
            }
          }
          // Sanitize amount fields (remove commas, parse as float)
          if (fieldName?.toLowerCase().includes('amt') && typeof value === 'string') {
            value = parseFloat(value.replace(/,/g, ''));
            if (isNaN(value)) value = 0;
          }
          
          // Store srNo for duplicate check
          if (fieldName === 'srNo') {
            srNo = String(value || '').trim();
          }
          
          // Set nested fields using dot notation
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
        
  if (!srNo) continue;

  // Recursively sanitize all amount fields (including nested)
  sanitizeAmounts(billData);
        
        // Debug: Show extracted data for this row
        console.log(`Row ${rowNumber} data:`, {
          srNo,
          vendorNo: billData.vendorNo,
          taxInvNo: billData.taxInvNo,
          taxInvDate: billData.taxInvDate,
          region: billData.region
      });
        
        // Check if bill already exists by srNo
        const existingBill = await Bill.findOne({ 
          $or: [{ srNo }, { excelSrNo: srNo }] 
        }).lean();
        
        // Check for unique combination of vendorNo, taxInvNo, taxInvDate, and region
        let duplicateByUniqueness = null;
        if (billData.vendorNo || billData.taxInvNo || billData.taxInvDate || billData.region) {
          const uniquenessQuery = {};
          
          // Add non-empty fields to the query
          if (billData.vendorNo) uniquenessQuery.vendorNo = billData.vendorNo;
          if (billData.taxInvNo) uniquenessQuery.taxInvNo = billData.taxInvNo;
          if (billData.region) uniquenessQuery.region = billData.region;
          
          // For date comparison, use date range to match same day regardless of time
          if (billData.taxInvDate) {
            const inputDate = new Date(billData.taxInvDate);
            const startOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate(), 0, 0, 0);
            const endOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate(), 23, 59, 59, 999);
            
            uniquenessQuery.taxInvDate = {
              $gte: startOfDay,
              $lte: endOfDay
            };
          }
          
          // Only check if we have at least 2 fields for meaningful uniqueness
          if (Object.keys(uniquenessQuery).length >= 2) {
            console.log(`Checking uniqueness for row ${rowNumber} with:`, uniquenessQuery);
            duplicateByUniqueness = await Bill.findOne(uniquenessQuery).lean();
            
 
          }
        }
        
        if (existingBill || duplicateByUniqueness) {
          if (patchOnly) {
            // Update existing bill (use the actual existing bill, not the duplicate)
            const billToUpdate = existingBill || duplicateByUniqueness;
            const updateData = { ...billData };
            
            // Handle master data references
            if (updateData.vendorName || updateData.vendorNo) {
              const vendor = vendors.find(v => 
                v.vendorName?.toLowerCase().includes(updateData.vendorName?.toLowerCase()) ||
                v.vendorNo == updateData.vendorNo
              );
              if (vendor) updateData.vendor = vendor._id;
            }
            
            if (updateData.region) {
              const region = regions.find(r => 
                r.name?.toLowerCase() === updateData.region?.toLowerCase()
              );
              if (region) updateData.region = region.name;
            }
            
            if (updateData.currency) {
              const curr = currencies.find(c => 
                c.currency?.toLowerCase() === updateData.currency?.toLowerCase()
              );
              if (curr) updateData.currency = curr._id;
            }
            
            if (updateData.typeOfInv) {
              const nature = natureOfWork.find(n => 
                n.natureOfWork?.toLowerCase().includes(updateData.typeOfInv?.toLowerCase())
              );
              if (nature) updateData.natureOfWork = nature._id;
            }
            
            if (updateData.panStatus) {
              const pan = panStatuses.find(p => 
                p.name?.toLowerCase() === updateData.panStatus?.toLowerCase()
              );
              if (pan) updateData.panStatus = pan._id;
            }
            
            if (updateData.compliance206AB) {
              const comp = compliance.find(c => 
                c.compliance206AB?.toLowerCase().includes(updateData.compliance206AB?.toLowerCase())
              );
              if (comp) updateData.compliance206AB = comp._id;
            }
            
            await Bill.findByIdAndUpdate(billToUpdate._id, updateData);
            results.toUpdate.push(billToUpdate._id);
          } else {
            results.skipped++;
          }
        } else if (!patchOnly) {
          // Create new bill
          const newBillData = { ...billData };
          
          // Set required fields with defaults
          newBillData.srNo = srNo;
          newBillData.excelSrNo = srNo;
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
          
          // Handle master data references
          if (newBillData.vendorName || newBillData.vendorNo) {
            const vendor = vendors.find(v => 
              v.vendorName?.toLowerCase().includes(newBillData.vendorName?.toLowerCase()) ||
              v.vendorNo == newBillData.vendorNo
            );
            newBillData.vendor = vendor ? vendor._id : new mongoose.Types.ObjectId();
          } else {
            newBillData.vendor = new mongoose.Types.ObjectId();
          }
          
          // Set default region
          const region = regions.find(r => 
            r.name?.toLowerCase() === newBillData.region?.toLowerCase()
          ) || regions[0];
          newBillData.region = region ? region.name : "DEFAULT";
          
          // Set default currency
          const currency = currencies.find(c => 
            c.currency?.toLowerCase() === newBillData.currency?.toLowerCase()
          ) || currencies.find(c => c.currency?.toLowerCase() === "inr") || currencies[0];
          newBillData.currency = currency ? currency._id : new mongoose.Types.ObjectId();
          
          // Set nature of work with improved matching
          let nature = null;
          if (newBillData.typeOfInv) {
            const typeOfInv = newBillData.typeOfInv.toLowerCase().trim();
            
            // Try exact match first
            nature = natureOfWork.find(n => 
              n.natureOfWork?.toLowerCase() === typeOfInv
            );
            
            // Try partial match (typeOfInv contains nature or vice versa)
            if (!nature) {
              nature = natureOfWork.find(n => {
                const natureName = n.natureOfWork?.toLowerCase();
                return natureName?.includes(typeOfInv) || typeOfInv.includes(natureName);
              });
            }
            
            // Try fuzzy matching for common variations
            if (!nature) {
              const typeWords = typeOfInv.split(/\s+/);
              nature = natureOfWork.find(n => {
                const natureName = n.natureOfWork?.toLowerCase();
                return typeWords.some(word => word.length > 3 && natureName?.includes(word));
              });
            }
          }
          
          // Default to "Others" if no match found
          if (!nature) {
            nature = natureOfWork.find(n => n.natureOfWork?.toLowerCase() === "others") || natureOfWork[0];
          }
          
          newBillData.natureOfWork = nature ? nature._id : new mongoose.Types.ObjectId();
          
          // Set optional references
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
          results.toInsert.push(newBill._id);
        }
        
      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error.message);
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = `Duplicate bill found - this combination of vendor, invoice number, date, and region already exists`;
        }
        
        results.errors.push({
          row: rowNumber,
          error: errorMessage,
          srNo: (typeof srNo !== 'undefined' ? srNo : null)
        });
      }
    }
    
    console.log('Import completed:', results);
    
    // Create a better response message
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
    
  } catch (error) {
    console.error('Excel import error:', error);
    throw error;
  }
};

