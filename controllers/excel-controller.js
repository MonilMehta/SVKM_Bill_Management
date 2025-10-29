import { generateExcelReport, generatePDFReport } from "../utils/report-generator-deprecated.js";
// Update imports to use the split CSV utility files
import { importBillsFromExcel } from "../utils/csv-import.js";
import { patchBillsFromExcelFile } from '../utils/csv-patch-extract.js';
import { insertVendorsFromExcel, updateVendorComplianceFromExcel } from '../utils/vendor-csv-utils.js';

import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import ExcelJS from "exceljs";
import Bill from '../models/bill-model.js';
import VendorMaster from '../models/vendor-master-model.js';

// Helper function to check if vendor validation should be skipped
const shouldSkipVendorValidation = async () => {
  try {
    if (!VendorMaster) return true;

    const count = await VendorMaster.countDocuments();
    // console.log(`Found ${count} vendors in database`);

    // If empty vendor table, skip validation
    return count === 0;
  } catch (error) {
    // console.error('Error checking vendor count:', error);
    return true; // Skip validation on error
  }
};

const generateReport = async (req, res) => {
  try {
    const { billIds, format = 'excel' } = req.body;

    // Normalize billIds input
    const ids = Array.isArray(billIds) ? billIds : billIds.split(',').map(id => id.trim());

    // Validate IDs
    if (!ids.length) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one bill to generate a report",
        toastMessage: "Please select at least one bill"
      });
    }

    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length) {
      return res.status(400).json({
        success: false,
        message: "Some bill IDs are invalid",
        toastMessage: "Invalid bill IDs selected. Please refresh and try again",
        invalidIds
      });
    }

    // Generate report based on format
    let fileBuffer, fileName, contentType;
    const timestamp = new Date().toISOString().split('T')[0];

    switch (format.toLowerCase()) {
      case 'pdf':
        fileBuffer = await generatePDFReport(ids);
        fileName = `bills-report-${timestamp}.pdf`;
        contentType = "application/pdf";
        break;
      case 'csv':
        fileBuffer = await exportBillsToCSV(ids);
        fileName = `bills-report-${timestamp}.csv`;
        contentType = "text/csv";
        break;
      case 'excel':
      default:
        fileBuffer = await generateExcelReport(ids);
        fileName = `bills-report-${timestamp}.xlsx`;
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        break;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", fileBuffer.length);
    return res.send(fileBuffer);
  } catch (error) {
    // console.error('Report generation error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate report",
      toastMessage: "Failed to generate report. Please try again",
      error: error.message
    });
  }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Define allowed file types
    const validExcelMimeTypes = [
      'application/vnd.ms-excel',                                          // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.oasis.opendocument.spreadsheet',                    // .odsx
      'text/csv'                                                           // .csv
    ];

    const validExtensions = /xlsx|xls|csv|ods/i;
    const extname = validExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = validExcelMimeTypes.includes(file.mimetype);

    // console.log('File details:', {
    //   originalname: file.originalname,
    //   mimetype: file.mimetype,
    //   extname: path.extname(file.originalname).toLowerCase()
    // });

    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error(`Invalid file type. Allowed types: xlsx, xls, csv. Received mimetype: ${file.mimetype}`));
  }
}).any();

const importBills = async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              reject(new Error('File size too large. Maximum size is 10MB'));
              break;
            default:
              reject(new Error(`File upload error: ${err.message}`));
          }
        } else if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.files || !req.files.length) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        toastMessage: "Please select a file to upload"
      });
    }

    // Check if we're in patch-only mode (don't create new bills)
    const patchOnly = req.query.patchOnly === 'true';
    // console.log(`Import mode: ${patchOnly ? 'patch-only' : 'normal'}`);

    const uploadedFile = req.files[0]; // Get the first uploaded file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, uploadedFile.originalname);
    // console.log(`Processing file: ${uploadedFile.originalname}`);

    // Check if we should skip vendor validation
    const skipVendorValidation = await shouldSkipVendorValidation();
    if (skipVendorValidation) {
      // console.log('SKIPPING VENDOR VALIDATION - Vendor table is empty or not accessible');
    }

    // Extract vendor numbers from Excel/CSV before processing
    // This allows us to validate vendors first
    let vendorNos = [];

    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, uploadedFile.buffer);

    // Check if VendorMaster model is available and validate vendors
    let validVendors = [];
    let validVendorNames = []; // Added - use vendor names instead of numbers

    if (VendorMaster && !skipVendorValidation) {
      try {
        // Extract vendor information from the file first
        const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();
        if (fileExtension === '.xlsx' || fileExtension === '.xls') {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(tempFilePath);
          const worksheet = workbook.getWorksheet(1);

          // Find both vendor number and vendor name columns
          const headers = [];
          let vendorNoColIdx = -1;
          let vendorNameColIdx = -1;

          worksheet.getRow(1).eachCell((cell, colNumber) => {
            const header = cell.value?.toString().trim();
            if (header === 'Vendor no') {
              vendorNoColIdx = colNumber;
            }
            if (header === 'Vendor Name') {
              vendorNameColIdx = colNumber;
            }
          });

          // If header row not found in first row, try second row (in case of column index row)
          if (vendorNoColIdx === -1 || vendorNameColIdx === -1) {
            worksheet.getRow(2).eachCell((cell, colNumber) => {
              const header = cell.value?.toString().trim();
              if (header === 'Vendor no') {
                vendorNoColIdx = colNumber;
              }
              if (header === 'Vendor Name') {
                vendorNameColIdx = colNumber;
              }
            });
          }

          // Extract vendor numbers and names for reference
          if (vendorNoColIdx > 0) {
            // console.log(`Found Vendor no column at index ${vendorNoColIdx}`);
            if (vendorNameColIdx > 0) {
              // console.log(`Found Vendor Name column at index ${vendorNameColIdx}`);
            }

            worksheet.eachRow((row, rowNumber) => {
              if (rowNumber > 2) { // Skip potential header rows
                const vendorNo = row.getCell(vendorNoColIdx).value;
                if (vendorNo) {
                  vendorNos.push(String(vendorNo).trim());
                }
              }
            });
          } else {
            // console.log('Could not find Vendor no column in Excel file');
          }
        }

        // Query vendor master for validation - use vendor names instead of numbers
        try {
          // Count total vendors in database first
          const totalVendorsInDB = await VendorMaster.countDocuments();
          // console.log(`Total vendors in database: ${totalVendorsInDB}`);

          if (totalVendorsInDB === 0) {
            // console.log('WARNING: Vendor table is empty, skipping vendor validation');
            skipVendorValidation = true;
          } else {
            // Get all vendors to validate by name
            const allVendors = await VendorMaster.find().lean();
            validVendors = allVendors;

            // Extract vendor names for validation
            validVendorNames = allVendors.map(v => v.vendorName || '');
            // console.log(`Found ${validVendorNames.length} valid vendor names in the database`);

            if (validVendorNames.length > 0) {
              // console.log(`Sample vendor names: ${validVendorNames.slice(0, 5).join(', ')}${validVendorNames.length > 5 ? '...' : ''}`);
            }

            if (validVendorNames.length === 0) {
              // console.log('WARNING: No vendor names found in the database!');

              // Try to get a sample of vendors to debug
              const sampleVendors = await VendorMaster.find().limit(5).lean();
              // console.log(`Sample vendors in DB:`, sampleVendors.map(v => ({
              //   vendorNo: v.vendorNo,
              //   vendorName: v.vendorName || 'N/A'
              // })));
            }
          }
        } catch (findError) {
          // console.error('Error querying VendorMaster collection:', findError);
          skipVendorValidation = true;
        }
      } catch (error) {
        // console.error('Error pre-validating vendors:', error);
        skipVendorValidation = true;
      }
    } else {
      // console.log('VendorMaster model not available or validation skipped, skipping vendor validation');
      skipVendorValidation = true;
    }

    // Determine file type and process accordingly
    const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();
    let importResult;

    try {
      // Pass the valid vendor list to the import function only if validation is enabled
      // Now we pass vendor names instead of vendor numbers
      const validVendorList = skipVendorValidation ? [] : validVendorNames;
      // console.log(`Passing ${validVendorList.length} valid vendor names to import function`);

      if (fileExtension === '.csv') {
        // For CSV files, we don't support patch-only mode yet
        if (patchOnly) {
          return res.status(400).json({
            success: false,
            message: "CSV patching is not supported yet. Please use Excel format."
          });
        }
        importResult = await importBillsFromCSV(tempFilePath, validVendorList);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        // For Excel files, pass the patchOnly flag
        importResult = await importBillsFromExcel(tempFilePath, validVendorList, patchOnly);
      } else {
        throw new Error("Unsupported file format");
      }
    } finally {
      // Clean up temp file regardless of success or failure
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    // Check for non-existent vendors if validation was not skipped
    if (!skipVendorValidation && importResult.nonExistentVendors && importResult.nonExistentVendors.length > 0) {
      const totalVendors = vendorNos.length;
      const invalidVendors = importResult.nonExistentVendors.map(v => v.vendorName || v.vendorNo);
      const uniqueInvalidVendors = [...new Set(invalidVendors)];

      return res.status(202).json({  // 202 Accepted - partial processing
        success: true,
        message: "Import completed with warnings - some vendors not found in the vendor master",
        toastMessage: `Import completed but ${uniqueInvalidVendors.length} vendor(s) were skipped`,
        details: {
          inserted: importResult.inserted?.length || 0,
          updated: importResult.updated?.length || 0,
          skipped: importResult.nonExistentVendors.length,
          totalVendors,
          validVendors: validVendorNames.length,
          invalidVendors: uniqueInvalidVendors.length
        },
        nonExistentVendors: uniqueInvalidVendors,
        skippedRows: importResult.nonExistentVendors.map(v => ({
          rowNumber: v.rowNumber,
          srNo: v.srNo,
          vendorName: v.vendorName || 'Unknown',
          vendorNo: v.vendorNo
        }))
      });
    }

    // Check for already existing bills
    if (importResult.alreadyExistingBills && importResult.alreadyExistingBills.length > 0) {
      return res.status(202).json({
        success: true,
        message: "Some bills already exist in the database. Please use the PATCH endpoint instead.",
        toastMessage: `${importResult.alreadyExistingBills.length} bill(s) already exist. Use update option instead`,
        details: {
          inserted: importResult.inserted?.length || 0,
          updated: importResult.updated?.length || 0,
          alreadyExisting: importResult.alreadyExistingBills.length,
          totalProcessed: importResult.totalProcessed,
          vendorValidation: skipVendorValidation ? 'skipped' : 'enabled',
          mode: patchOnly ? 'patch-only' : 'normal'
        },
        existingBills: importResult.alreadyExistingBills.map(bill => ({
          srNo: bill.srNo,
          _id: bill._id,
          vendorName: bill.vendorName || 'Unknown',
          rowNumber: bill.rowNumber
        })),
        recommendation: "To update these bills, please use the PATCH endpoint: POST /billdownload/patch-bills"
      });
    }

    // Return success response with clearer formatting info
    return res.status(200).json({
      success: true,
      message: importResult.message || `Successfully processed ${importResult.totalProcessed || 0} bills`,
      toastMessage: `Successfully imported ${(importResult.inserted || 0) + (importResult.updated || 0)} bill(s)`,
      details: {
        inserted: importResult.inserted || 0,
        updated: importResult.updated || 0,
        skipped: importResult.skipped || 0,
        errors: importResult.errors || 0,
        total: importResult.totalProcessed || 0,
        vendorValidation: skipVendorValidation ? 'skipped' : 'enabled',
        mode: patchOnly ? 'patch-only' : 'normal'
      },
      data: {
        inserted: Array.isArray(importResult.inserted) ? importResult.inserted.map(bill => {
          const srNoStr = String(bill.srNo || '');
          return {
            _id: bill._id,
            srNo: srNoStr,
            excelSrNo: bill.excelSrNo || srNoStr,
            formattedCorrectly: srNoStr.startsWith('2425')
          };
        }) : [],
        updated: Array.isArray(importResult.updated) ? importResult.updated.map(bill => {
          const srNoStr = String(bill.srNo || '');
          return {
            _id: bill._id,
            srNo: srNoStr,
            excelSrNo: bill.excelSrNo || srNoStr,
            formattedCorrectly: srNoStr.startsWith('2425')
          };
        }) : []
      }
    });
  } catch (error) {
    // console.error('Import error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to import bills",
      toastMessage: "Failed to import bills. Please check the file format and try again",
      error: error.message
    });
  }
};
// Function to patch bills from Excel/CSV without creating new records
const patchBillsFromExcel = async (req, res) => {
  try {
    // console.log('[PATCH DEBUG] patchBillsFromExcel called');
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              reject(new Error('File size too large. Maximum size is 10MB'));
              break;
            default:
              reject(new Error(`File upload error: ${err.message}`));
          }
        } else if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    if (!req.files || !req.files.length) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        toastMessage: "Please select a file to upload"
      });
    }

    // Get team from query parameter or user role
    let teamName = req.query.team;

    // If no team is specified in the query, determine from user role if available
    if (!teamName && req.user && req.user.role) {
      // Map user roles to teams
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

      teamName = roleToTeam[req.user.role];
    }

    // Admin users can bypass team restrictions
    const isAdmin = req.user && req.user.role === 'admin';
    if (isAdmin) {
      teamName = null; // Allow all fields
    }

    const uploadedFile = req.files[0];
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, uploadedFile.originalname);
    // console.log(`Processing file for patch: ${uploadedFile.originalname} by team: ${teamName || 'unrestricted'}`);
    fs.writeFileSync(tempFilePath, uploadedFile.buffer);

    // Call the patch logic with team name
    const patchResult = await patchBillsFromExcelFile(tempFilePath, teamName);

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // If any rows were skipped or errors occurred, return error
    if ((patchResult.skipped && patchResult.skipped > 0) || (patchResult.errors && patchResult.errors.length > 0)) {
      return res.status(400).json({
        success: false,
        message: teamName
        ? `Patch process complete with errors or skipped rows for ${teamName}`
        : 'Patch process complete with errors or skipped rows (unrestricted)',
        toastMessage: `Update failed. ${patchResult.skipped || 0} row(s) skipped due to errors`,
        details: patchResult
      });
    }

    return res.status(200).json({
      success: true,
      message: teamName
        ? `Patch process complete for ${teamName}`
        : 'Patch process complete (unrestricted)',
      toastMessage: `Successfully updated ${patchResult.updated} bill(s)`,
      details: patchResult
    });
  } catch (error) {
    // console.error('Patch error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to patch bills",
      toastMessage: "Failed to update bills. Please check the file format and try again",
      error: error.message
    });
  }
};

// Function to import all vendor data from Excel/CSV
const importVendors = async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          reject(new Error(`File upload error: ${err.message}`));
        } else if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.files || !req.files.length) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        toastMessage: "Please select a file to upload"
      });
    }

    const uploadedFile = req.files[0];
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, uploadedFile.originalname);
    // console.log(`Processing vendor import file: ${uploadedFile.originalname}`);

    // Check file extension
    const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();
    if (fileExtension !== '.xlsx' && fileExtension !== '.xls') {
      return res.status(400).json({
        success: false,
        message: "Only Excel files (.xlsx, .xls) are allowed for vendor import",
        toastMessage: "Please upload an Excel file (.xlsx or .xls)"
      });
    }

    fs.writeFileSync(tempFilePath, uploadedFile.buffer);

    // Validate required columns
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tempFilePath);
    const worksheet = workbook.getWorksheet(1);
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell) => {
      headers.push((cell.value || '').toString().trim());
    });

    const requiredHeaders = ['Vendor No', 'Vendor Name', 'PAN Status', '206AB Compliance'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingHeaders.join(', ')}`,
        toastMessage: `Excel file is missing required columns: ${missingHeaders.join(', ')}`,
        missingHeaders,
        foundHeaders: headers
      });
    }
    
    // console.log("Before function call");
    const importResult = await insertVendorsFromExcel(tempFilePath);
    // console.log("After function call");

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // If any rows were skipped or errors occurred, return error
    if ((importResult.skipped && importResult.skipped > 0) || (importResult.errors && importResult.errors.length > 0)) {
      return res.status(400).json({
        success: false,
        message: 'Vendor import completed with errors or skipped rows',
        toastMessage: `Vendor import completed with ${importResult.errors?.length || 0} error(s)`,
        details: importResult
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Vendor import process complete',
      toastMessage: `Successfully imported ${importResult.inserted} vendor(s)`,
      details: importResult
    });
  } catch (error) {
    // console.error('Vendor import error:', error);
    return res.status(400).json({
      success: false,
      message: 'Error importing vendors',
      toastMessage: 'Failed to import vendors. Please check the file format and try again',
      error: error.message
    });
  }
};

// Function to update only compliance and PAN status for vendors
const updateVendorCompliance = async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          reject(new Error(`File upload error: ${err.message}`));
        } else if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.files || !req.files.length) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        toastMessage: "Please select a file to upload"
      });
    }

    const uploadedFile = req.files[0];
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, uploadedFile.originalname);
    // console.log(`Processing vendor compliance update file: ${uploadedFile.originalname}`);

    // Check file extension
    const fileExtension = path.extname(uploadedFile.originalname).toLowerCase();
    if (fileExtension !== '.xlsx' && fileExtension !== '.xls') {
      return res.status(400).json({
        success: false,
        message: "Only Excel files (.xlsx, .xls) are allowed for vendor import",
        toastMessage: "Please upload an Excel file (.xlsx or .xls)"
      });
    }

    fs.writeFileSync(tempFilePath, uploadedFile.buffer);

    // Validate required columns
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tempFilePath);
    const worksheet = workbook.getWorksheet(1);
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell((cell) => {
      headers.push((cell.value || '').toString().trim());
    });

    const requiredHeaders = ['Vendor No', 'Vendor Name', 'PAN Status', '206AB Compliance'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingHeaders.join(', ')}`,
        toastMessage: `Excel file is missing required columns: ${missingHeaders.join(', ')}`,
        missingHeaders,
        foundHeaders: headers
      });
    }

    const updateResult = await updateVendorComplianceFromExcel(tempFilePath);

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // If any errors occurred, return with error details
    if (updateResult.errors && updateResult.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: updateResult.summaryMessage || 'Vendor compliance update completed with errors',
        toastMessage: `Vendor compliance update completed with ${updateResult.errors.length} error(s)`,
        details: {
          updated: updateResult.updated,
          skipped: updateResult.skipped,
          errors: updateResult.errors,
          referenceOptions: updateResult.referenceOptions
        }
      });
    }

    // If no vendors were updated (but no errors), return warning
    if (updateResult.updated === 0) {
      return res.status(400).json({
        success: false,
        message: updateResult.summaryMessage || 'No vendors were updated',
        toastMessage: 'No vendors were updated. Please check vendor numbers',
        details: {
          updated: updateResult.updated,
          skipped: updateResult.skipped,
          errors: updateResult.errors,
          referenceOptions: updateResult.referenceOptions
        }
      });
    }

    // Success - vendors were updated with no errors
    return res.status(200).json({
      success: true,
      message: updateResult.summaryMessage || 'Vendor compliance update process complete',
      toastMessage: `Successfully updated ${updateResult.updated} vendor(s)`,
      details: {
        updated: updateResult.updated,
        skipped: updateResult.skipped,
        referenceOptions: updateResult.referenceOptions
      }
    });
  } catch (error) {
    // console.error('Vendor compliance update error:', error);
    return res.status(400).json({
      success: false,
      message: 'Error updating vendor compliance',
      toastMessage: 'Failed to update vendor compliance. Please check the file format and try again',
      error: error.message
    });
  }
};

export default {
  generateReport,
  importBills,
  patchBillsFromExcel,
  importVendors,
  updateVendorCompliance
  // fixBillSerialNumbers,
  // bulkFixSerialNumbers
};