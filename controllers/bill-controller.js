import Bill from "../models/bill-model.js";
import {
  buildAmountRangeQuery,
  buildDateRangeQuery,
} from "../utils/bill-helper.js";
import VendorMaster from "../models/vendor-master-model.js";
import RegionMaster from "../models/region-master-model.js";
import PanStatusMaster from "../models/pan-status-master-model.js";
import ComplianceMaster from "../models/compliance-master-model.js";
import NatureOfWorkMaster from "../models/nature-of-work-master-model.js";
import CurrencyMaster from "../models/currency-master-model.js";
import User from "../models/user-model.js";
import { s3Delete, s3Upload } from "../utils/s3.js";
import mongoose from "mongoose";

// Validation function for amount only (vendor validation is now handled via vendor reference)
const validateAmount = (amount) => {
  // Validate amount - should be a valid number if provided
  if (amount !== null && amount !== undefined && amount !== "") {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return {
        valid: false,
        message: "Amount must be a valid number",
      };
    }
  }

  return {
    valid: true,
    message: "Valid",
  };
};

const getFinancialYearPrefix = (date) => {
  const d = date || new Date();
  let currentYear = d.getFullYear().toString().substr(-2);
  if (d.getMonth() >= 3) {
    return `${currentYear}`;
  } else {
    let prevYear = (parseInt(currentYear) - 1).toString().padStart(2, "0");
    return `${prevYear}`;
  }
};

const deleteAttachment = async (req, res, next) => {
  try {
    const { fileKey, billId } = req.body;
    if (!fileKey || !billId) {
      return res
        .status(400)
        .json({ message: "File key and BillId is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(billId)) {
      return res.status(400).json({
        message: "Invalid Bill ID format",
      });
    }

    const existingBill = await Bill.findById(billId);
    if (!existingBill) {
      return res.status(404).json({
        message: "Bill not found",
      });
    }

    const attachmentExists = existingBill.attachments.some(
      (attachment) => attachment.fileKey === fileKey
    );

    if (!attachmentExists) {
      return res.status(404).json({
        message: "Attachment not found in this bill",
      });
    }

    const deleteResult = await s3Delete(fileKey);

    const updatedBill = await Bill.findByIdAndUpdate(
      billId,
      {
        $pull: {
          attachments: { fileKey: fileKey },
        },
      },
      { new: true }
    );
    return res.status(201).json({
      success: true,
      message: "attachement deleted successfully",
      updatedBill,
    });
  } catch (error) {
    console.log("Error while deleting the attachment", error);
    return res.status(400).json({
      status: false,
      message: "failed to delete the attachment",
    });
  }
};

const createBill = async (req, res) => {
  try {
    // Get role from query params
    const { role } = req.query;
 
    const typeofinv=req.body.typeOfInv;
    // Accept vendorNo or vendorName from request
    let vendorQuery = {};
    if (req.body.vendorNo) {
      vendorQuery.vendorNo = req.body.vendorNo;
    } else if (req.body.vendorName) {
      vendorQuery.vendorName = req.body.vendorName;
    }
    const vendorDoc = await VendorMaster.findOne(vendorQuery);
    if (!vendorDoc) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} files for upload`);

      for (const file of req.files) {
        try {
          const uploadResult = await s3Upload(file);
          attachments.push({
            fileName: uploadResult.fileName,
            fileKey: uploadResult.fileKey,
            fileUrl: uploadResult.url,
          });
          console.log(`File uploaded: ${uploadResult.fileName}`);
        } catch (uploadError) {
          console.error(
            `Error uploading file ${file.originalname}:`,
            uploadError
          );
          return res.status(404).json({
            success: false,
            message: "Files could not be uploaded , please try again",
          });
        }
      }
    }

    // Create a base object with all fields initialized to null or empty objects
    const fyPrefix = getFinancialYearPrefix(new Date(req.body.billDate));
    console.log(`[Create] Creating new bill with FY prefix: ${fyPrefix}`);

    // Find the highest serial number for this financial year
    const highestSerialBill = await Bill.findOne(
      { srNo: { $regex: `^${fyPrefix}` } },
      { srNo: 1 },
      { sort: { srNo: -1 } }
    );

    let nextSerial = 1;

    if (highestSerialBill && highestSerialBill.srNo) {
      const serialPart = parseInt(highestSerialBill.srNo.substring(4));
      nextSerial = serialPart + 1;
    }
    console.log(
      `[Create] Highest serial number found: ${highestSerialBill?.srNo}, next serial: ${nextSerial}`
    );

    const serialFormatted = nextSerial.toString().padStart(5, "0");
    const newSrNo = `${fyPrefix}${serialFormatted}`;
    console.log(`[Create] Generated new srNo: ${newSrNo}`);

    // Build a bill object with all schema fields, setting null/default for missing fields
    const schemaFields = Object.keys(Bill.schema.paths);
    const billData = {};
    for (const field of schemaFields) {
      if (["_id", "__v", "createdAt", "updatedAt"].includes(field)) continue;
      // Skip vendor-related fields as they're derived from vendor reference
      if (
        [
          "vendorNo",
          "vendorName",
          "gstNumber",
          "panStatus",
          "compliance206AB",
        ].includes(field)
      )
        continue;
      if (field === "srNo") {
        billData.srNo = newSrNo;
        continue;
      }
      if (field.startsWith("workflowState.")) continue;
      if (field === "vendor") {
        billData.vendor = vendorDoc._id;
        continue;
      }
      // All vendor-related fields are now derived from vendor reference, skip direct assignment
      if (field === "complianceMaster" && req.body.complianceMaster) {
        let complianceDoc = null;
        if (typeof req.body.complianceMaster === "string") {
          complianceDoc = await ComplianceMaster.findOne({
            complianceStatus: req.body.complianceMaster,
          });
        } else if (
          typeof req.body.complianceMaster === "object" &&
          req.body.complianceMaster._id
        ) {
          complianceDoc = await ComplianceMaster.findById(
            req.body.complianceMaster._id
          );
        }
        billData.complianceMaster = complianceDoc ? complianceDoc._id : null;
        continue;
      }
      if (field === "natureOfWork" && req.body.natureOfWork) {
        let natureOfWorkDoc = null;
        if (typeof req.body.natureOfWork === "string") {
          natureOfWorkDoc = await NatureOfWorkMaster.findOne({
            natureOfWork: req.body.natureOfWork,
          });
        } else if (
          typeof req.body.natureOfWork === "object" &&
          req.body.natureOfWork._id
        ) {
          natureOfWorkDoc = await NatureOfWorkMaster.findById(
            req.body.natureOfWork._id
          );
        }
        billData.natureOfWork = natureOfWorkDoc ? natureOfWorkDoc._id : null;
        continue;
      }
      if (field === "currency" && req.body.currency) {
        let currencyDoc = null;
        if (typeof req.body.currency === "string") {
          currencyDoc = await CurrencyMaster.findOne({
            currency: req.body.currency,
          });
        } else if (
          typeof req.body.currency === "object" &&
          req.body.currency._id
        ) {
          currencyDoc = await CurrencyMaster.findById(req.body.currency._id);
        }
        billData.currency = currencyDoc ? currencyDoc._id : null;
        continue;
      }
      // compliance206AB field removed - now derived from vendor

      billData[field] = req.body[field] !== undefined ? req.body[field] : null;
    }

    // Uniqueness check for vendor, taxInvNo, taxInvDate, region only for specific type of invoice
    console.log("Type of invoice is : ",typeofinv);
    if (
  typeofinv != "Advance/LC/BG" &&
  typeofinv != "Direct FI Entry" &&
  typeofinv != "Proforma Invoice"
  ) {
    
    const uniqueQuery = {
      vendor: vendorDoc._id, // Use vendor ObjectId instead of vendorNo
      taxInvNo: req.body.taxInvNo,
      region: req.body.region,
    };
    
    // For date comparison, use date range to match same day regardless of time
    if (req.body.taxInvDate) {
      const inputDate = new Date(req.body.taxInvDate);
      const startOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate(), 0, 0, 0);
      const endOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate(), 23, 59, 59, 999);
      
      uniqueQuery.taxInvDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }
    
    const duplicate = await Bill.findOne(uniqueQuery);
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message:
          "A bill with the same vendorNo, taxInvNo, taxInvDate, and region already exists.",
      });
    }
  }

    const newBillData = {
      ...billData,
      workflowState: {
        currentState: "Site_Officer",
        history: [],
        lastUpdated: new Date(),
      },
      attachments,
      currentCount: role === "3" ? 3 : 1,
      maxCount: role === "3" ? 3 : 1,
      siteStatus: role === "3" ? "accept" : "hold",
    };  
    const bill = new Bill(newBillData);
    await bill.save();
    bill.pimoMumbai.markReceived = role === "3" ? true : false;
    await bill.save();
    // populate the vendor details , fix billId population during bill return
    const populatedBill = await Bill.findById(bill._id).populate("region")
      .populate("currency")
      .populate("natureOfWork")
      .populate({
        path: "vendor",
        populate: [
          { path: "PANStatus", model: "PanStatusMaster" },
          { path: "complianceStatus", model: "ComplianceMaster" },
        ],
      });
    res.status(201).json({ success: true, bill: populatedBill });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getBills = async (req, res) => {
  try {
    const filter = req.user.role.includes("admin")
      ? {}
      : { region: { $in: req.user.region } };
    const bills = await Bill.find(filter)
      .populate("region")
      .populate("currency")
      .populate("natureOfWork")
      .populate({
        path: "vendor",
        populate: [
          { path: "PANStatus", model: "PanStatusMaster" },
          { path: "complianceStatus", model: "ComplianceMaster" },
        ],
      }); // Populate vendor with nested PAN status and compliance
    // Map region, currency, and natureOfWork to their names
    const mappedBills = bills.map((bill) => {
      const billObj = bill.toObject();
      billObj.region = Array.isArray(billObj.region)
        ? billObj.region.map((r) => r?.name || r)
        : billObj.region;
      billObj.currency = billObj.currency?.currency || billObj.currency || null;
      billObj.natureOfWork =
        billObj.natureOfWork?.natureOfWork || billObj.natureOfWork || null;

      // Overwrite vendor fields directly from populated vendor
      if (billObj.vendor && typeof billObj.vendor === "object") {
        billObj.vendorNo = billObj.vendor.vendorNo;
        billObj.vendorName = billObj.vendor.vendorName;
        billObj.PAN = billObj.vendor.PAN;
        billObj.gstNumber = billObj.vendor.GSTNumber;

        // Get compliance and PAN status from populated vendor references
        billObj.compliance206AB =
          billObj.vendor.complianceStatus?.compliance206AB ||
          billObj.vendor.complianceStatus ||
          null;
        billObj.panStatus =
          billObj.vendor.PANStatus?.name || billObj.vendor.PANStatus || null;
      }
      // Remove the vendor object itself
      delete billObj.vendor;
      return billObj;
    });
    res.status(200).json(mappedBills);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const receiveBillByPimoAccounts = async (req, res) => {
  try {
    const { billId, role, accept } = req.body;
    if (!billId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const user = await User.findById(req.user.id);

    const now = new Date();

    let updateFields = {};
    if (!user.role.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `User does not have the '${role}' role`,
      });
    }

    if (role)
      switch (role) {
        case "site_pimo":
          updateFields["pimoMumbai.dateReceived"] = now;
          updateFields["pimoMumbai.receivedBy"] = user.name;
          updateFields["pimoMumbai.markReceived"] = true;
          updateFields["siteStatus"] = "accept";
          break;

        case "accounts":
          updateFields["accountsDept.dateReceived"] = now;
          updateFields["accountsDept.receivedBy"] = user.name;
          updateFields["accountsDept.markReceived"] = true;
          break;

        default:
          return res.status(400).json({
            success: false,
            message: "Invalid role for receiving bill",
          });
      }

    const updatedBill = await Bill.findByIdAndUpdate(billId, updateFields, {
      new: true,
    });

    return res.status(200).json({
      success: true,
      message: "Bill received successfully",
      bill: updatedBill,
    });
  } catch (error) {
    console.error("Error receiving bill:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to receive bill",
      error: error.message,
    });
  }
};

const getBill = async (req, res) => {
  try {
    // Check for srNo in body or query, and if it is exactly 7 digits
    const srNo = req.body.srNo || req.query.srNo;
    let bill;

    let nbill = await Bill.findById(req.params.id);
    console.log("Bill without masters", nbill);

    bill = await Bill.findById(req.params.id)
      .populate("region")
      .populate("currency")
      .populate("natureOfWork")
      .populate({
        path: "vendor",
        populate: [
          { path: "PANStatus", model: "PanStatusMaster" },
          { path: "complianceStatus", model: "ComplianceMaster" },
        ],
      });

    // console.log("Retrieved bill:" , bill);
    console.log("Retrieved bill nature of work:", bill?.natureOfWork);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    const billObj = bill.toObject();
    billObj.region = Array.isArray(billObj.region)
      ? billObj.region.map((r) => r?.name || r)
      : billObj.region;
    billObj.currency = billObj.currency?.currency || billObj.currency || null;
    billObj.natureOfWork =
      billObj.natureOfWork?.natureOfWork || billObj.natureOfWork || null;

    // Overwrite vendor fields directly from populated vendor
    if (billObj.vendor && typeof billObj.vendor === "object") {
      billObj.vendorNo = billObj.vendor.vendorNo;
      billObj.vendorName = billObj.vendor.vendorName;
      billObj.PAN = billObj.vendor.PAN;
      billObj.GSTNumber = billObj.vendor.GSTNumber;

      // Get compliance and PAN status from populated vendor references
      billObj.compliance206AB =
        billObj.vendor.complianceStatus?.compliance206AB ||
        billObj.vendor.complianceStatus ||
        null;
      billObj.panStatus =
        billObj.vendor.PANStatus?.name || billObj.vendor.PANStatus || null;
    }
    console.log("Bill object vendor:", billObj.vendor);
    // Remove the vendor object itself
    delete billObj.vendor;
    res.status(200).json(billObj);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateBill = async (req, res) => {
  try {
    // Find the existing bill
    const existingBill = await Bill.findById(req.params.id);
    if (!existingBill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Create a merged object that preserves existing values when not in request body
    const updatedData = {};

    // Check if bill date is being changed, which may require regenerating the srNo
    let regenerateSerialNumber = false;
    if (req.body.billDate && existingBill.billDate) {
      const oldDate = new Date(existingBill.billDate);
      const newDate = new Date(req.body.billDate);

      // Get financial year prefixes for old and new dates
      const oldPrefix = getFinancialYearPrefix(oldDate);
      const newPrefix = getFinancialYearPrefix(newDate);

      // If financial year has changed, we need to regenerate the serial number
      if (oldPrefix !== newPrefix) {
        console.log(
          `[Update] Financial year changed from ${oldPrefix} to ${newPrefix}, will regenerate srNo`
        );
        regenerateSerialNumber = true;
        // Set flag for pre-save hook to regenerate srNo
        existingBill._forceSerialNumberGeneration = true;
      }
    }

    // Get all fields from the bill schema
    const schemaFields = Object.keys(Bill.schema.paths);

    // For each field in the schema
    for (const field of schemaFields) {
      if (["_id", "createdAt", "updatedAt", "__v"].includes(field)) continue;
      if (field === "srNo" && regenerateSerialNumber) continue;
      // Skip vendor-related fields as they're derived from vendor reference
      if (
        [
          "vendorNo",
          "vendorName",
          "gstNumber",
          "panStatus",
          "compliance206AB",
        ].includes(field)
      )
        continue;
      if (field in req.body) {
        updatedData[field] = req.body[field];
      } else if (existingBill[field] !== undefined) {
        updatedData[field] = existingBill[field];
      }
    }

    // Special handling for nested objects and arrays to avoid overwrites
    // Handle workflowState specially to preserve history
    if (req.body.workflowState) {
      updatedData.workflowState = {
        ...existingBill.workflowState.toObject(),
        ...req.body.workflowState,
        history: existingBill.workflowState.history || [],
      };

      // If history is provided in the request, append it rather than replace
      if (
        req.body.workflowState.history &&
        Array.isArray(req.body.workflowState.history)
      ) {
        updatedData.workflowState.history = [
          ...existingBill.workflowState.history,
          ...req.body.workflowState.history,
        ];
      }
    }

    // Validate vendorNo and amount
    const check = validateVendorNoAndAmount(
      req.body.vendorNo !== undefined
        ? req.body.vendorNo
        : existingBill.vendorNo,
      req.body.amount !== undefined ? req.body.amount : existingBill.amount
    );
    if (!check.valid) {
      return res.status(400).json({ message: check.message });
    }

    // Set import mode to avoid validation errors for non-required fields
    existingBill.setImportMode(true);

    // Update the bill with the merged data
    const bill = await Bill.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(bill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.status(200).json({ message: "Bill deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PATCH method for bills that preserves existing non-null values
const patchBill = async (req, res) => {
  try {
    // Find by serial number if provided
    if (req.body.srNo && !req.params.id) {
      const billBySrNo = await Bill.findOne({ srNo: req.body.srNo });
      if (billBySrNo) {
        // Set the id param and call this function again
        req.params.id = billBySrNo._id;
      } else {
        return res.status(404).json({
          success: false,
          message: "Bill with provided Serial Number not found",
        });
      }
    }

    // Find the existing bill
    const existingBill = await Bill.findById(req.params.id);
    if (!existingBill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    // Handle file attachments if present
    let attachments = existingBill.attachments || [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await s3Upload(file);
          attachments.push({
            fileName: uploadResult.fileName,
            fileKey: uploadResult.fileKey,
            fileUrl: uploadResult.url,
          });
        } catch (uploadError) {
          console.error(
            `Error uploading file ${file.originalname}:`,
            uploadError
          );
          return res.status(404).json({
            success: false,
            message: "Files could not be uploaded, please try again",
          });
        }
      }
    }

    // Process QS-related fields and organize them properly
    organizeQSFields(req.body);

    // Check if bill date is being changed, which may require regenerating the srNo
    let regenerateSerialNumber = false;
    if (req.body.billDate && existingBill.billDate) {
      const oldDate = new Date(existingBill.billDate);
      const newDate = new Date(req.body.billDate);

      // Get financial year prefixes for old and new dates
      const oldPrefix = getFinancialYearPrefix(oldDate);
      const newPrefix = getFinancialYearPrefix(newDate);

      // If financial year has changed, we need to regenerate the serial number
      if (oldPrefix !== newPrefix) {
        console.log(
          `[Patch] Financial year changed from ${oldPrefix} to ${newPrefix}, will regenerate srNo`
        );
        regenerateSerialNumber = true;
        // Set flag for pre-save hook to regenerate srNo
        existingBill._forceSerialNumberGeneration = true;

        // Store old serial number in srNoOld
        existingBill.srNoOld = existingBill.srNo;
      }
    }

    // Create an object to hold the updates, only including fields that are in the request
    const updates = {};

    // Get all fields from the bill schema
    const schemaFields = Object.keys(Bill.schema.paths);

    // Track fields that we've processed to avoid duplicates
    const processedFields = new Set();

     // check if vendorNo, vendor objectId, or vendorName is provided, considered all three cases, find the vendor and update updates.vendor field
    // able to update vendor details after creating the bill
    if (req.body.vendorNo || req.body.vendorName || req.body.vendor) {
      if (req.body.vendor && mongoose.Types.ObjectId.isValid(req.body.vendor)) {
        const vendorDoc = await VendorMaster.findById(req.body.vendor);
        if (!vendorDoc) {
          return res.status(404).json({ 
            success: false,
            message: "Vendor not found" 
          });
        }
        updates.vendor = vendorDoc._id;
      } else if (req.body.vendorNo || req.body.vendorName) {
        let vendorQuery = {};
        if (req.body.vendorNo) {
          vendorQuery.vendorNo = req.body.vendorNo;
        } else if (req.body.vendorName) {
          vendorQuery.vendorName = req.body.vendorName;
        }
        const vendorDoc = await VendorMaster.findOne(vendorQuery);
        if (!vendorDoc) {
          return res.status(404).json({ 
            success: false,
            message: "Vendor not found" 
          });
        }
        updates.vendor = vendorDoc._id;
      }
      processedFields.add("vendor");
      processedFields.add("vendorNo");
      processedFields.add("vendorName");
    }

    // Process top-level fields
    for (const field of Object.keys(req.body)) {
      // Skip fields we'll handle specially
      if (processedFields.has(field)) continue;
      if (["_id", "createdAt", "updatedAt", "__v"].includes(field)) continue;
      if (field === "srNo" && regenerateSerialNumber) continue;
      if (schemaFields.includes(field)) {
        let newValue = req.body[field];
        if (field === "natureOfWork" && req.body.natureOfWork) {
          let natureOfWorkDoc = null;
          if (typeof req.body.natureOfWork === "string") {
            natureOfWorkDoc = await NatureOfWorkMaster.findOne({
              natureOfWork: req.body.natureOfWork,
            });
          } else if (
            typeof req.body.natureOfWork === "object" &&
            req.body.natureOfWork._id
          ) {
            natureOfWorkDoc = await NatureOfWorkMaster.findById(
              req.body.natureOfWork._id
            );
          }
          newValue = natureOfWorkDoc ? natureOfWorkDoc._id : null;
        }
        if (field === "currency" && req.body.currency) {
          let currencyDoc = null;
          if (typeof req.body.currency === "string") {
            currencyDoc = await CurrencyMaster.findOne({
              currency: req.body.currency,
            });
          } else if (
            typeof req.body.currency === "object" &&
            req.body.currency._id
          ) {
            currencyDoc = await CurrencyMaster.findById(req.body.currency._id);
          }
          newValue = currencyDoc ? currencyDoc._id : null;
        }
        const currentValue = existingBill[field];
        if (
          currentValue === null ||
          currentValue === undefined ||
          newValue !== null
        ) {
          updates[field] = newValue;
        }
        processedFields.add(field);
      }
    }

    // Handle nested objects
    schemaFields.forEach((path) => {
      const pathParts = path.split(".");
      if (pathParts.length > 1) {
        const topLevel = pathParts[0];

        // If the top-level field is in the request body and is an object
        if (req.body[topLevel] && typeof req.body[topLevel] === "object") {
          // Initialize the object in updates if not already there
          if (!updates[topLevel]) {
            updates[topLevel] = {};
          }

          // Get the nested field
          const nestedField = pathParts.slice(1).join(".");
          const nestedValue = req.body[topLevel][nestedField];

          // If the nested field exists in the request
          if (nestedValue !== undefined) {
            // Get the current value
            let currentNestedValue;
            try {
              currentNestedValue = existingBill.get(path);
            } catch (e) {
              currentNestedValue = null;
            }

            // Only update if current is null or new is not null
            if (
              currentNestedValue === null ||
              currentNestedValue === undefined ||
              nestedValue !== null
            ) {
              // Set the nested field
              const lastPart = pathParts[pathParts.length - 1];
              let currentObj = updates[topLevel];

              for (let i = 1; i < pathParts.length - 1; i++) {
                if (!currentObj[pathParts[i]]) {
                  currentObj[pathParts[i]] = {};
                }
                currentObj = currentObj[pathParts[i]];
              }

              currentObj[lastPart] = nestedValue;
            }
          }

          processedFields.add(topLevel);
        }
      }
    });

    // Add attachments if any new files were uploaded
    if (req.files && req.files.length > 0) {
      updates.attachments = attachments;
    }

    // Validate amount only if being updated (vendor validation is done via vendor reference)
    if (req.body.amount !== undefined) {
      const amount = req.body.amount;
      if (amount !== null && amount !== undefined && amount !== "") {
        const numAmount = Number(amount);
        if (isNaN(numAmount)) {
          return res
            .status(400)
            .json({ message: "Amount must be a valid number" });
        }
      }
    }

    // Set import mode to avoid validation errors
    existingBill.setImportMode(true);

     // Only check uniqueness for certain types of invoices
    const typeOfInv = req.body.typeOfInv !== undefined ? req.body.typeOfInv : existingBill.typeOfInv;
    let uniqueQuery = {};
    if (
      typeOfInv != "Advance/LC/BG" &&
      typeOfInv != "Direct FI Entry" &&
      typeOfInv != "Proforma Invoice"
    ) {
    // Uniqueness check for vendor, taxInvNo, taxInvDate, region (ignore self)
    uniqueQuery = {
      vendor:
        updates.vendor !== undefined ? updates.vendor : existingBill.vendor,
      taxInvNo:
        req.body.taxInvNo !== undefined
          ? req.body.taxInvNo
          : existingBill.taxInvNo,
      region:
        req.body.region !== undefined ? req.body.region : existingBill.region,
      _id: { $ne: existingBill._id },
    };
  }
    
    // For date comparison, use date range to match same day regardless of time
    const taxInvDate = req.body.taxInvDate !== undefined ? req.body.taxInvDate : existingBill.taxInvDate;
    if (taxInvDate) {
      const inputDate = new Date(taxInvDate);
      const startOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate(), 0, 0, 0);
      const endOfDay = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate(), 23, 59, 59, 999);
      
      uniqueQuery.taxInvDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }
    
    const duplicate = await Bill.findOne(uniqueQuery);
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message:
          "A bill with the same vendor, taxInvNo, taxInvDate, and region already exists.",
      });
    }

    // Only update the bill if there are changes
    if (Object.keys(updates).length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes to apply",
        data: existingBill,
      });
    }

    console.log("Applying updates:", updates);

    // Apply the updates
    const updatedBill = await Bill.findByIdAndUpdate(
      existingBill._id,
      { $set: updates },
      { new: true, runValidators: false }
    )
      .populate("region")
      .populate("currency")
      .populate("natureOfWork")
      .populate({
        path: "vendor",
        populate: [
          { path: "PANStatus", model: "PanStatusMaster" },
          { path: "complianceStatus", model: "ComplianceMaster" },
        ],
      });

    // Format the response similar to getBill
    const billObj = updatedBill.toObject();
    billObj.region = Array.isArray(billObj.region)
      ? billObj.region.map((r) => r?.name || r)
      : billObj.region;
    billObj.currency = billObj.currency?.currency || billObj.currency || null;
    billObj.natureOfWork =
      billObj.natureOfWork?.natureOfWork || billObj.natureOfWork || null;

    // Overwrite vendor fields directly from populated vendor
    if (billObj.vendor && typeof billObj.vendor === "object") {
      billObj.vendorNo = billObj.vendor.vendorNo;
      billObj.vendorName = billObj.vendor.vendorName;
      billObj.PAN = billObj.vendor.PAN;
      billObj.GSTNumber = billObj.vendor.GSTNumber;

      // Get compliance and PAN status from populated vendor references
      billObj.compliance206AB =
        billObj.vendor.complianceStatus?.compliance206AB ||
        billObj.vendor.complianceStatus ||
        null;
      billObj.panStatus =
        billObj.vendor.PANStatus?.name || billObj.vendor.PANStatus || null;
    }
    // Remove the vendor object itself
    delete billObj.vendor;


    return res.status(200).json({
      success: true,
      message: "Bill updated successfully",
      data: billObj,
    });
  } catch (error) {
    console.error("Error patching bill:", error);
    return res.status(400).json({
      success: false,
      message: "Error updating bill",
      error: error.message,
    });
  }
};

// Helper function to handle QS-related fields and organize them properly
const organizeQSFields = (data) => {
  // Check if we have QS-related fields that need to be organized
  const qsFieldMappings = {
    "Dt given to QS for Inspection": {
      target: "qsInspection",
      property: "dateGiven",
    },
    "Name of QS": { target: "qsInspection", property: "name" },
    "Checked  by QS with Dt of Measurment": {
      target: "qsMeasurementCheck",
      property: "dateGiven",
    },
    "Given to vendor-Query/Final Inv": {
      target: "vendorFinalInv",
      property: "dateGiven",
    },
    "Dt given to QS for COP": { target: "qsCOP", property: "dateGiven" },
    "Name - QS": { target: "qsCOP", property: "name" },
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
      if (
        data[sourceField] !== null &&
        data[sourceField] !== undefined &&
        data[sourceField] !== ""
      ) {
        data[mapping.target][mapping.property] = data[sourceField];
      }

      // Remove the original field to avoid duplication
      delete data[sourceField];
    }
  });

  return data;
};

const filterBills = async (req, res) => {
  try {
    const {
      vendorName,
      vendorNo,
      projectDescription,
      gstNumber,
      startDate,
      endDate,
      status,
      minAmount,
      maxAmount,
      natureOfWork,
      region,
      currency,
      poCreated,
      compliance206AB,
      panStatus,
    } = req.query;

    const query = {};

    // For vendor-based filters, we need to find vendors first and then filter bills
    if (vendorName || vendorNo || gstNumber) {
      const vendorQuery = {};
      if (vendorName)
        vendorQuery.vendorName = { $regex: vendorName, $options: "i" };
      if (vendorNo) vendorQuery.vendorNo = { $regex: vendorNo, $options: "i" };
      if (gstNumber)
        vendorQuery.GSTNumber = { $regex: gstNumber, $options: "i" };

      const vendors = await VendorMaster.find(vendorQuery).select("_id");
      if (vendors.length > 0) {
        query.vendor = { $in: vendors.map((v) => v._id) };
      } else {
        // If no vendors match, return empty result
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: parseInt(req.query.limit) || 10,
          },
        });
      }
    }

    // Text-based filters with case-insensitive partial matching for bill fields
    if (projectDescription)
      query.projectDescription = { $regex: projectDescription, $options: "i" };

    // Exact match filters - with case-insensitive region
    if (status) query.status = status;
    if (natureOfWork) query.natureOfWork = natureOfWork;

    // Improved region filtering with dynamic RegionMaster support
    if (region) {
      // Try to find the region in RegionMaster (case-insensitive)
      const regionDoc = await RegionMaster.findOne({
        name: { $regex: `^${region}$`, $options: "i" },
      });
      if (regionDoc) {
        query.region = { $in: [regionDoc.name] };
      } else {
        // If not found, fallback to partial match (case-insensitive)
        query.region = { $regex: region, $options: "i" };
      }
    }

    if (currency) query.currency = currency;
    if (poCreated) query.poCreated = poCreated;

    // For compliance206AB and panStatus, filter by vendor's compliance/PAN status
    if (compliance206AB || panStatus) {
      const vendorFilterQuery = {};
      if (compliance206AB) vendorFilterQuery.complianceStatus = compliance206AB;
      if (panStatus) vendorFilterQuery.PANStatus = panStatus;

      const vendorsWithStatus = await VendorMaster.find(
        vendorFilterQuery
      ).select("_id");
      if (vendorsWithStatus.length > 0) {
        if (query.vendor) {
          // If vendor filter already exists, intersect the results
          const existingVendorIds = query.vendor.$in || [query.vendor];
          const statusVendorIds = vendorsWithStatus.map((v) => v._id);
          query.vendor = {
            $in: existingVendorIds.filter((id) =>
              statusVendorIds.some((statusId) => statusId.equals(id))
            ),
          };
        } else {
          query.vendor = { $in: vendorsWithStatus.map((v) => v._id) };
        }
      } else {
        // If no vendors match the compliance/PAN status, return empty result
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: parseInt(req.query.limit) || 10,
          },
        });
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query.billDate = buildDateRangeQuery(startDate, endDate);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.amount = buildAmountRangeQuery(minAmount, maxAmount);
    }

    // Execute query with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const bills = await Bill.find(query)
      .sort({ billDate: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Bill.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bills,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error filtering bills",
      error: error.message,
    });
  }
};

const getBillsStats = async (req, res) => {
  try {
    const stats = await Bill.aggregate([
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          avgAmount: { $avg: "$amount" },
          minAmount: { $min: "$amount" },
          maxAmount: { $max: "$amount" },
          statusCounts: {
            $push: {
              k: "$status",
              v: 1,
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalBills: 1,
          totalAmount: 1,
          avgAmount: 1,
          minAmount: 1,
          maxAmount: 1,
          statusCounts: {
            $arrayToObject: "$statusCounts",
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {},
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error getting bills statistics",
      error: error.message,
    });
  }
};

// Method to get workflow history for a bill
export const getWorkflowHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    return res.status(200).json({
      success: true,
      currentState: bill.workflowState.currentState,
      history: bill.workflowState.history,
      lastUpdated: bill.workflowState.lastUpdated,
    });
  } catch (error) {
    console.error("Workflow history retrieval error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve workflow history",
      error: error.message,
    });
  }
};

// Method to get all bills in a specific workflow state
export const getBillsByWorkflowState = async (req, res) => {
  try {
    const { state } = req.params;

    // Validate state is a valid workflow state
    const validStates = [
      "Site_Officer",
      "Site_PIMO",
      "QS_Site",
      "PIMO_Mumbai",
      "Directors",
      "Accounts",
      "Completed",
      "Rejected",
    ];

    if (!validStates.includes(state)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workflow state",
        validStates,
      });
    }

    const bills = await Bill.find({
      "workflowState.currentState": state,
    })
      .select("srNo amount status workflowState.lastUpdated vendor")
      .populate("vendor", "vendorName vendorNo")
      .sort({ "workflowState.lastUpdated": -1 });

    // Map the results to include vendor fields at top level
    const mappedBills = bills.map((bill) => {
      const billObj = bill.toObject();
      if (billObj.vendor) {
        billObj.vendorName = billObj.vendor.vendorName;
        billObj.vendorNo = billObj.vendor.vendorNo;
        delete billObj.vendor;
      }
      return billObj;
    });

    return res.status(200).json({
      success: true,
      count: mappedBills.length,
      data: mappedBills,
    });
  } catch (error) {
    console.error("Bills by state retrieval error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve bills by workflow state",
      error: error.message,
    });
  }
};

// Get bill by srNo (7 digits)
export const getBillBySrNo = async (req, res) => {
  try {
    const { srNo } = req.params;
    if (!/^\d{7}$/.test(srNo)) {
      return res
        .status(400)
        .json({ message: "Invalid srNo format. Must be 7 digits." });
    }
    const bill = await Bill.findOne({ srNo })
      .populate("region")
      .populate("currency")
      .populate("natureOfWork")
      .populate({
        path: "vendor",
        populate: [
          { path: "PANStatus", model: "PanStatusMaster" },
          { path: "complianceStatus", model: "ComplianceMaster" },
        ],
      }); // Populate vendor with nested PAN status and compliance
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    const billObj = bill.toObject();
    billObj.region = Array.isArray(billObj.region)
      ? billObj.region.map((r) => r?.name || r)
      : billObj.region;
    billObj.currency = billObj.currency?.currency || billObj.currency || null;
    billObj.natureOfWork =
      billObj.natureOfWork?.natureOfWork || billObj.natureOfWork || null;

    // Overwrite vendor fields directly from populated vendor
    if (billObj.vendor && typeof billObj.vendor === "object") {
      billObj.vendorNo = billObj.vendor.vendorNo;
      billObj.vendorName = billObj.vendor.vendorName;
      billObj.PAN = billObj.vendor.PAN;
      billObj.GSTNumber = billObj.vendor.GSTNumber;

      // Get compliance and PAN status from populated vendor references
      billObj.compliance206AB =
        billObj.vendor.complianceStatus?.compliance206AB ||
        billObj.vendor.complianceStatus ||
        null;
      billObj.panStatus =
        billObj.vendor.PANStatus?.name || billObj.vendor.PANStatus || null;
    }
    // Remove the vendor object itself
    delete billObj.vendor;
    res.status(200).json(billObj);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//PATCH: Edit payment instructions for a bill (Accounts / Trustees / Admin)
const editPaymentInstructions = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      paymentInstructions,
      remarksForPayInstructions,
      f110Identification,
      paymentDate,
      paymentAmt,
      status,
    } = req.body;

    const updateObj = {};
    if (paymentInstructions !== undefined)
      updateObj["accountsDept.paymentInstructions"] = paymentInstructions;
    if (remarksForPayInstructions !== undefined)
      updateObj["accountsDept.remarksForPayInstructions"] =
        remarksForPayInstructions;
    if (f110Identification !== undefined)
      updateObj["accountsDept.f110Identification"] = f110Identification;
    if (paymentDate !== undefined)
      updateObj["accountsDept.paymentDate"] = paymentDate;
      updateObj["accountsDept.status"] = 'Paid';
    if (paymentAmt !== undefined)
      updateObj["accountsDept.paymentAmt"] = paymentAmt;
    if (status !== undefined) updateObj["accountsDept.status"] = status;

    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid payment instruction fields provided for update",
      });
    }

    // const updatedBill = await Bill.findByIdAndUpdate(
    //   id,
    //   { $set: updateObj },
    //   { new: true, runValidators: true }
    // );

    const updatedBill = await Bill.findOneAndUpdate(
      { srNo: id },
      { $set: updateObj },
      { new: true, runValidators: true }
    );

    if (!updatedBill) {
      return res
        .status(404)
        .json({ success: false, message: "Bill not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Payment instructions updated successfully",
      bill: updatedBill,
    });
  } catch (error) {
    console.error("Edit payment instructions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment instructions",
      error: error.message,
    });
  }
};

const notReceivedPimo = async (req, res) => {
  try {
    const { billId } = req.body;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: "Bill ID is required",
      });
    }

    const updateFields = {
      currentCount: 1,
      maxCount: 1,
      siteStatus: "hold",
      "pimoMumbai.dateGiven": null,
      "pimoMumbai.namePIMO": null || "",
      "pimoMumbai.dateReceived": null,
      "pimoMumbai.receivedBy": null || "",
      "pimoMumbai.markReceived": null || false,
    };

    const billFound = await Bill.findById(billId);
    if (!billFound) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    updateFields.maxCount = Math.max(billFound.maxCount, 1);

    const bill = await Bill.findByIdAndUpdate(
      billId,
      { $set: updateFields },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Bill put on hold by PIMO Mumbai",
      bill,
    });
  } catch (error) {
    console.error("Failed to perform the operation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to perform the operation",
      error: error.message,
    });
  }
};

const notReceivedAccounts = async (req, res) => {
  try {
    const { billId } = req.body;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: "Bill ID is required",
      });
    }

    const updateFields = {
      currentCount: 3,
      maxCount: 3,
      "accountsDept.dateGiven": null,
      "accountsDept.dateReceived": null,
      "accountsDept.receivedBy": null || "",
      "accountsDept.markReceived": null || false,
    };

    const billFound = await Bill.findById(billId);
    if (!billFound) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    updateFields.maxCount = Math.max(billFound.maxCount, 3);

    const bill = await Bill.findByIdAndUpdate(
      billId,
      { $set: updateFields },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Bill put on hold by Accounts Department",
      bill,
    });
  } catch (error) {
    console.error("Failed to perform the operation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to perform the operation",
      error: error.message,
    });
  }
};

const accountsPaymentReject = async (req, res) => {
  try {
    const { billId } = req.body;

    if (!billId) {
      return res.status(400).json({
        success: false,
        message: "Bill ID is required",
      });
    }

    const billFound = await Bill.findById(billId);
    if (!billFound) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }
    
    const updateFields = {
      "accountsDept.paymentDate": null,
      "accountsDept.status": "Unpaid"
    };
    
    const bill = await Bill.findByIdAndUpdate(
      billId,
      { $set: updateFields },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Payment rejected by Accounts Department",
      bill,
    });
  } catch (error) {
    console.error("Failed to perform the operation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to perform the operation",
      error: error.message,
    });
  }
};

const getFilteredBills = async (req, res) => {
  const { role } = req.query;
  try {
    console.log("Hii");
    let filter = { region: { $in: req.user.region } };

    switch (role) {
      case "site_officer":
        filter = {
          ...filter,
          "pimoMumbai.dateReceived": null,
          siteStatus: "hold"
        };
        break;
      
      case "site_pimo":
        filter = {
          ...filter,
          $or: [
            {
              "pimoMumbai.dateGiven": { $ne: null },
              "accountsDept.dateReceived": null
            },
            {
              siteStatus: "accept",
              "accountsDept.dateReceived": null
            }
          ]
        };
        break;

      case "accounts":
        filter = {
          ...filter,
          "accountsDept.paymentDate": null,
          "accountsDept.dateGiven": { $ne: null },
          currentCount: 5
        };
        break;

      case "director":
        filter = {
          ...filter,
          siteStatus: { $in: ["accept", "hold"] },
          "accountsDept.status": "Unpaid"
        };
        break;

      case "qs_site":
        filter = {
          ...filter,
          currentCount: 2
        };
        break;
    }

    const bills = await Bill.find(filter)
      .populate("region")
      .populate("currency")
      .populate("natureOfWork")
      .populate({
        path: "vendor",
        populate: [
          { path: "PANStatus", model: "PanStatusMaster" },
          { path: "complianceStatus", model: "ComplianceMaster" },
        ],
      });

    const mappedBills = bills.map((bill) => {
      const billObj = bill.toObject();
      billObj.region = Array.isArray(billObj.region)
        ? billObj.region.map((r) => r?.name || r)
        : billObj.region;
      billObj.currency = billObj.currency?.currency || billObj.currency || null;
      billObj.natureOfWork =
        billObj.natureOfWork?.natureOfWork || billObj.natureOfWork || null;

      if (billObj.vendor && typeof billObj.vendor === "object") {
        billObj.vendorNo = billObj.vendor.vendorNo;
        billObj.vendorName = billObj.vendor.vendorName;
        billObj.PAN = billObj.vendor.PAN;
        billObj.gstNumber = billObj.vendor.GSTNumber;

        billObj.compliance206AB =
          billObj.vendor.complianceStatus?.compliance206AB ||
          billObj.vendor.complianceStatus ||
          null;
        billObj.panStatus =
          billObj.vendor.PANStatus?.name || billObj.vendor.PANStatus || null;
      }
      delete billObj.vendor;
      return billObj;
    });
    res.status(200).json(mappedBills);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export default {
  createBill,
  getBill,
  getBills,
  updateBill,
  deleteBill,
  filterBills,
  getBillsStats,
  // advanceWorkflow,
  // revertWorkflow,
  // rejectBill,
  getWorkflowHistory,
  getBillsByWorkflowState,
  // recoverRejectedBill,
  patchBill,
  // regenerateAllSerialNumbers,
  // changeWorkflowState,
  receiveBillByPimoAccounts,
  getBillBySrNo,
  editPaymentInstructions,
  deleteAttachment,
  notReceivedPimo,
  notReceivedAccounts,
  accountsPaymentReject,
  getFilteredBills,
};

// Method to regenerate serial numbers for all bills
// export const regenerateAllSerialNumbers = async (req, res) => {
//   try {
//     if (!req.user || !req.user.role.includes("admin")) {
//       return res.status(403).json({
//         success: false,
//         message: "Only administrators can perform this operation",
//       });
//     }

//     const bills = await Bill.find({}).sort({ createdAt: 1 });

//     console.log(`[Regenerate] Found ${bills.length} bills to process`);

//     // Group bills by financial year
//     const billsByFY = {};

//     // Group each bill by financial year
//     bills.forEach((bill) => {
//       if (!bill.billDate) {
//         console.log(`[Regenerate] Skipping bill ${bill._id} - no bill date`);
//         return;
//       }

//       const fyPrefix = getFinancialYearPrefix(new Date(bill.billDate));

//       if (!billsByFY[fyPrefix]) {
//         billsByFY[fyPrefix] = [];
//       }

//       billsByFY[fyPrefix].push(bill);
//     });

//     console.log(
//       `[Regenerate] Bills grouped by financial years: ${Object.keys(
//         billsByFY
//       ).join(", ")}`
//     );

//     // Process each financial year group
//     const results = {};
//     const errors = [];

//     for (const [fyPrefix, fyBills] of Object.entries(billsByFY)) {
//       results[fyPrefix] = {
//         totalBills: fyBills.length,
//         processedBills: 0,
//         errorCount: 0,
//       };

//       // Sort bills by date within each FY
//       fyBills.sort((a, b) => new Date(a.billDate) - new Date(b.billDate));

//       // Assign new serial numbers in sequence
//       for (let i = 0; i < fyBills.length; i++) {
//         const bill = fyBills[i];

//         try {
//           // Store old serial number
//           bill.srNoOld = bill.srNo || null;

//           // Create new serial number
//           const serialNumber = i + 1;
//           const serialFormatted = serialNumber.toString().padStart(4, "0");
//           bill.srNo = `${fyPrefix}${serialFormatted}`;
//           g().padStart(5, "0");
//           bill.srNo = `${fyPrefix}${serialFormatted}`;
//           // Save bill
//           // Save bill
//           await bill.save();
//           results[fyPrefix].processedBills++;

//           console.log(
//             `[Regenerate] Updated bill ${bill._id}: ${
//               bill.srNoOld || "null"
//             } → ${bill.srNo}`
//           );
//         } catch (error) {
//           console.error(`[Regenerate] Error updating bill ${bill._id}:`, error);
//           errors.push({ id: bill._id, error: error.message });
//           results[fyPrefix].errorCount++;
//         }
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Serial number regeneration complete",
//       results,
//       errors: errors.length > 0 ? errors : null,
//     });
//   } catch (error) {
//     console.error("[Regenerate] Error regenerating serial numbers:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to regenerate serial numbers",
//       error: error.message,
//     });
//   }
// };

// // Change the workflow state of a bill
// export const changeWorkflowState = async (req, res) => {
//   const { id } = req.params;
//   const { newState } = req.body;
//   const bill = await Bill.findById(id);
//   if (!bill) {
//     return res.status(404).json({
//       success: false,
//       message: "Bill not found",
//     });
//   }
//   bill.workflowState.history.push({
//     state: bill.workflowState.currentState,
//     timestamp: new Date(),
//     actor: req.body.actor,
//     comments: req.body.comments,
//     action: req.body.action || "forward",
//   });
//   bill.workflowState.currentState = newState;
//   await bill.save();
//   return res.status(200).json({
//     success: true,
//     message: "Workflow state updated successfully",
//     bill,
//   });
// };

