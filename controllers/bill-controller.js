import Bill from "../models/bill-model.js";
import {
  buildAmountRangeQuery,
  buildDateRangeQuery,
} from "../utils/bill-helper.js";
import WorkflowTransition from '../models/workflow-transition-model.js';
import VendorMaster from "../models/vendor-master-model.js";

const getFinancialYearPrefix = (date) => {
  const d = date || new Date();
  let currentYear = d.getFullYear().toString().substr(-2);

  if (d.getMonth() >= 3) { 
    return `${currentYear}${parseInt(currentYear) + 1}`;
  } else {
    return `${parseInt(currentYear) - 1}${currentYear}`;
  }
};

const createBill = async (req, res) => {
  const vendorExists = await VendorMaster.findById(req.body.vendor);
  if(!vendorExists){
    return res.status(404).json({message:"Vendor not found"});
  }
  
  try {
    // Create a base object with all fields initialized to null or empty objects
    const defaultBill = {
      // srNo will be automatically generated in the pre-save hook
      srNoOld: null,
      typeOfInv: req.body.typeOfInv,
      workflowState: {
        currentState: "Site_Officer",
        history: [],
        lastUpdated: new Date()
      },
      projectDescription: req.body.projectDescription,
      vendorNo: req.body.vendorNo,
      vendorName: req.body.vendorName,
      gstNumber: req.body.gstNumber,
      compliance206AB: req.body.compliance206AB,
      panStatus: req.body.panStatus,
      poCreated: req.body.poCreated || "No",
      poNo: req.body.poNo || null,
      poDate: req.body.poDate || null,
      poAmt: req.body.poAmt || null,
      proformaInvNo: req.body.proformaInvNo || null,
      proformaInvDate: req.body.proformaInvDate || null,
      proformaInvAmt: req.body.proformaInvAmt || null,
      proformaInvRecdAtSite: req.body.proformaInvRecdAtSite || null,
      proformaInvRecdBy: req.body.proformaInvRecdBy || null,
      taxInvNo: req.body.taxInvNo || null,
      taxInvDate: req.body.taxInvDate || null,
      taxInvAmt: req.body.taxInvAmt || null,
      taxInvRecdAtSite: req.body.taxInvRecdAtSite || null,
      taxInvRecdBy: req.body.taxInvRecdBy || null,
      department: req.body.department || null,
      remarksBySiteTeam: req.body.remarksBySiteTeam || null,
      attachment: req.body.attachment || null,
      attachmentType: req.body.attachmentType || null,
      advanceDate: req.body.advanceDate || null,
      advanceAmt: req.body.advanceAmt || null,
      advancePercentage: req.body.advancePercentage || null,
      advRequestEnteredBy: req.body.advRequestEnteredBy || null,
      qualityEngineer: req.body.qualityEngineer || {
        name: null,
        dateGiven: null
      },
      qsInspection: req.body.qsInspection || {
        name: null,
        dateGiven: null
      },
      qsMeasurementCheck: req.body.qsMeasurementCheck || {
        dateGiven: null
      },
      vendorFinalInv: req.body.vendorFinalInv || {
        name: null,
        dateGiven: null
      },
      qsCOP: req.body.qsCOP || {
        name: null,
        dateGiven: null
      },
      copDetails: req.body.copDetails || {
        date: null,
        amount: null
      },
      remarksByQSTeam: req.body.remarksByQSTeam || null,
      migoDetails: req.body.migoDetails || {
        date: null,
        no: null,
        amount: null,
        doneBy: null,
        dateGiven: null
      },
      invReturnedToSite: req.body.invReturnedToSite || null,
      siteEngineer: req.body.siteEngineer || {
        name: null,
        dateGiven: null
      },
      architect: req.body.architect || {
        name: null,
        dateGiven: null
      },
      siteIncharge: req.body.siteIncharge || {
        name: null,
        dateGiven: null
      },
      remarks: req.body.remarks || null,
      siteOfficeDispatch: req.body.siteOfficeDispatch || {
        name: null,
        dateGiven: null
      },
      siteStatus: req.body.siteStatus || null,
      status: req.body.status || "accept",
      pimoMumbai: req.body.pimoMumbai || {
        dateGiven: null,
        dateReceived: null,
        receivedBy: null,
        dateGivenPIMO: null,
        namePIMO: null,
        dateGivenPIMO2: null,
        namePIMO2: null,
        dateReceivedFromIT: null,
        dateReceivedFromPIMO: null
      },
      qsMumbai: req.body.qsMumbai || {
        name: null,
        dateGiven: null
      },
      itDept: req.body.itDept || {
        name: null,
        dateGiven: null,
        dateReceived: null
      },
      sesDetails: req.body.sesDetails || {
        no: null,
        amount: null,
        date: null,
        doneBy: null
      },
      approvalDetails: req.body.approvalDetails || {
        directorApproval: {
          dateGiven: null,
          dateReceived: null
        },
        remarksPimoMumbai: null
      },
      accountsDept: req.body.accountsDept || {
        dateGiven: null,
        givenBy: null,
        receivedBy: null,
        dateReceived: null,
        returnedToPimo: null,
        receivedBack: null,
        invBookingChecking: null,
        paymentInstructions: null,
        remarksForPayInstructions: null,
        f110Identification: null,
        paymentDate: null,
        hardCopy: null,
        accountsIdentification: null,
        paymentAmt: null,
        remarksAcctsDept: null,
        status: "unpaid"
      },
      billDate: req.body.billDate,
      vendor: req.body.vendor,
      amount: req.body.amount,
      currency: req.body.currency,
      region: req.body.region,
      natureOfWork: req.body.natureOfWork
    };

    // Create the bill with all fields initialized
    const bill = new Bill(defaultBill);
    
    // Set import mode to avoid mongoose validation errors for non-required fields
    bill.setImportMode(true);
    
    await bill.save();
    res.status(201).json(bill);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getBills = async (req, res) => {
  try {
    const bills = await Bill.find();
    res.status(200).json(bills);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.status(200).json(bill);
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
        console.log(`[Update] Financial year changed from ${oldPrefix} to ${newPrefix}, will regenerate srNo`);
        regenerateSerialNumber = true;
        // Set flag for pre-save hook to regenerate srNo
        existingBill._forceSerialNumberGeneration = true;
      }
    }
    
    // Get all fields from the bill schema
    const schemaFields = Object.keys(Bill.schema.paths);
    
    // For each field in the schema
    schemaFields.forEach(field => {
      // Skip _id, createdAt, updatedAt, __v fields
      if (['_id', 'createdAt', 'updatedAt', '__v'].includes(field)) {
        return;
      }
      
      // Skip srNo if it needs to be regenerated
      if (field === 'srNo' && regenerateSerialNumber) {
        return;
      }
      
      // If the field exists in request body, use it; otherwise keep existing value
      if (field in req.body) {
        updatedData[field] = req.body[field];
      } else if (existingBill[field] !== undefined) {
        updatedData[field] = existingBill[field];
      }
    });
    
    // Special handling for nested objects and arrays to avoid overwrites
    // Handle workflowState specially to preserve history
    if (req.body.workflowState) {
      updatedData.workflowState = {
        ...existingBill.workflowState.toObject(),
        ...req.body.workflowState,
        history: existingBill.workflowState.history || []
      };
      
      // If history is provided in the request, append it rather than replace
      if (req.body.workflowState.history && Array.isArray(req.body.workflowState.history)) {
        updatedData.workflowState.history = [
          ...existingBill.workflowState.history,
          ...req.body.workflowState.history
        ];
      }
    }
    
    // Set import mode to avoid validation errors for non-required fields
    existingBill.setImportMode(true);
    
    // Update the bill with the merged data
    const bill = await Bill.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
      runValidators: true
    });
    
    // Log the workflow transition
    await WorkflowTransition.recordTransition(
      bill, 
      bill.workflowState.currentState, 
      req.body.workflowState?.currentState === bill.workflowState.currentState ? 'update' : 
                  (req.body.workflowState?.currentState === 'Rejected' ? 'reject' : 'forward'),
      req.user, 
      req.body.workflowState?.comments || '',
      { 
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        device: req.headers['user-agent'] // Could be improved with a proper device detection library
      }
    );
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
          message: "Bill with provided Serial Number not found" 
        });
      }
    }

    // Find the existing bill
    const existingBill = await Bill.findById(req.params.id);
    if (!existingBill) {
      return res.status(404).json({ 
        success: false, 
        message: "Bill not found" 
      });
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
        console.log(`[Patch] Financial year changed from ${oldPrefix} to ${newPrefix}, will regenerate srNo`);
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
    
    // Process top-level fields
    Object.keys(req.body).forEach(field => {
      // Skip fields we'll handle specially
      if (processedFields.has(field)) return;
      
      // Ignore _id and metadata fields
      if (['_id', 'createdAt', 'updatedAt', '__v'].includes(field)) return;
      
      // Skip srNo if it needs to be regenerated
      if (field === 'srNo' && regenerateSerialNumber) return;
      
      // If it's a normal field in the schema
      if (schemaFields.includes(field)) {
        // Only update if the existing value is null or the new value is not null
        const currentValue = existingBill[field];
        const newValue = req.body[field];
        
        if (currentValue === null || currentValue === undefined || newValue !== null) {
          updates[field] = newValue;
        }
        
        processedFields.add(field);
      }
    });
    
    // Handle nested objects
    schemaFields.forEach(path => {
      const pathParts = path.split('.');
      if (pathParts.length > 1) {
        const topLevel = pathParts[0];
        
        // If the top-level field is in the request body and is an object
        if (req.body[topLevel] && typeof req.body[topLevel] === 'object') {
          // Initialize the object in updates if not already there
          if (!updates[topLevel]) {
            updates[topLevel] = {};
          }
          
          // Get the nested field
          const nestedField = pathParts.slice(1).join('.');
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
            if (currentNestedValue === null || currentNestedValue === undefined || nestedValue !== null) {
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
    
    // Set import mode to avoid validation errors
    existingBill.setImportMode(true);
    
    // Only update the bill if there are changes
    if (Object.keys(updates).length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes to apply",
        data: existingBill
      });
    }
    
    console.log('Applying updates:', updates);
    
    // Apply the updates
    const updatedBill = await Bill.findByIdAndUpdate(
      existingBill._id,
      { $set: updates },
      { new: true, runValidators: false }
    );
    
    return res.status(200).json({
      success: true,
      message: "Bill updated successfully",
      data: updatedBill
    });
    
  } catch (error) {
    console.error('Error patching bill:', error);
    return res.status(400).json({
      success: false,
      message: "Error updating bill",
      error: error.message
    });
  }
};

// Helper function to handle QS-related fields and organize them properly
const organizeQSFields = (data) => {
  // Check if we have QS-related fields that need to be organized
  const qsFieldMappings = {
    "Dt given to QS for Inspection": { target: "qsInspection", property: "dateGiven" },
    "Name of QS": { target: "qsInspection", property: "name" },
    "Checked  by QS with Dt of Measurment": { target: "qsMeasurementCheck", property: "dateGiven" },
    "Given to vendor-Query/Final Inv": { target: "vendorFinalInv", property: "dateGiven" },
    "Dt given to QS for COP": { target: "qsCOP", property: "dateGiven" },
    "Name - QS": { target: "qsCOP", property: "name" }
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

    // Text-based filters with case-insensitive partial matching
    if (vendorName) query.vendorName = { $regex: vendorName, $options: "i" };
    if (vendorNo) query.vendorNo = { $regex: vendorNo, $options: "i" };
    if (projectDescription)
      query.projectDescription = { $regex: projectDescription, $options: "i" };
    if (gstNumber) query.gstNumber = { $regex: gstNumber, $options: "i" };

    // Exact match filters - with case-insensitive region
    if (status) query.status = status;
    if (natureOfWork) query.natureOfWork = natureOfWork;
    
    // Improved region filtering with case insensitivity
    if (region) {
      // Handle region case-insensitively to match enum values
      const validRegions = [
        "MUMBAI", "KHARGHAR", "AHMEDABAD", "BANGALURU", "BHUBANESHWAR",
        "CHANDIGARH", "DELHI", "NOIDA", "NAGPUR", "GANSOLI", "HOSPITAL",
        "DHULE", "SHIRPUR", "INDORE", "HYDERABAD"
      ];
      
      const normalizedRegion = region.trim().toUpperCase();
      const matchedRegion = validRegions.find(r => r === normalizedRegion ||
                                              r.includes(normalizedRegion) ||
                                              normalizedRegion.includes(r));
      
      if (matchedRegion) {
        query.region = matchedRegion;
      } else {
        // If no direct match, use regex for partial matching
        query.region = { $regex: region, $options: "i" };
      }
    }
    
    if (currency) query.currency = currency;
    if (poCreated) query.poCreated = poCreated;
    if (compliance206AB) query.compliance206AB = compliance206AB;
    if (panStatus) query.panStatus = panStatus;

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

// Method to advance a bill to the next workflow state
export const advanceWorkflow = async (req, res) => {
  console.log("advanceWorkflow", req.body);
  try {
    console.log("advanceWorkflow", req.body);
    const { id } = req.params;
    const { actor, comments } = req.body;
    
    if (!actor) {
      return res.status(400).json({ 
        success: false, 
        message: "Actor name is required to advance workflow" 
      });
    }
    
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ 
        success: false, 
        message: "Bill not found" 
      });
    }
    
    const advanced = bill.moveToNextState(actor, comments);
    if (!advanced) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot advance further, bill is already at the final stage"
      });
    }
    
    await bill.save();
    
    return res.status(200).json({ 
      success: true, 
      message: "Bill advanced to next stage", 
      currentState: bill.workflowState.currentState,
      lastTransition: bill.workflowState.history[bill.workflowState.history.length - 1]
    });
    
  } catch (error) {
    console.error('Workflow advancement error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to advance workflow lalalal",
      error: error.message 
    });
  }
};

// Method to revert a bill to the previous workflow state
export const revertWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const { actor, comments } = req.body;
    
    if (!actor) {
      return res.status(400).json({ 
        success: false, 
        message: "Actor name is required to revert workflow" 
      });
    }
    
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ 
        success: false, 
        message: "Bill not found" 
      });
    }
    
    const reverted = bill.moveToPreviousState(actor, comments);
    if (!reverted) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot revert further, bill is already at the initial stage"
      });
    }
    
    await bill.save();
    
    return res.status(200).json({ 
      success: true, 
      message: "Bill reverted to previous stage", 
      currentState: bill.workflowState.currentState,
      lastTransition: bill.workflowState.history[bill.workflowState.history.length - 1]
    });
    
  } catch (error) {
    console.error('Workflow reversion error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to revert workflow",
      error: error.message 
    });
  }
};

// Method to reject a bill in the workflow
export const rejectBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { actor, comments } = req.body;
    
    if (!actor) {
      return res.status(400).json({ 
        success: false, 
        message: "Actor name is required to reject bill" 
      });
    }
    
    if (!comments) {
      return res.status(400).json({ 
        success: false, 
        message: "Comments are required when rejecting a bill" 
      });
    }
    
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ 
        success: false, 
        message: "Bill not found" 
      });
    }
    
    bill.rejectBill(actor, comments);
    await bill.save();
    
    return res.status(200).json({ 
      success: true, 
      message: "Bill has been rejected", 
      currentState: bill.workflowState.currentState,
      lastTransition: bill.workflowState.history[bill.workflowState.history.length - 1]
    });
    
  } catch (error) {
    console.error('Bill rejection error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to reject bill",
      error: error.message 
    });
  }
};

// New method to recover a bill from rejected state back to a specific workflow state
export const recoverRejectedBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { actor, comments, targetState } = req.body;
    
    if (!actor) {
      return res.status(400).json({ 
        success: false, 
        message: "Actor name is required to recover workflow" 
      });
    }
    
    if (!comments) {
      return res.status(400).json({ 
        success: false, 
        message: "Comments are required when recovering a bill" 
      });
    }
    
    if (!targetState) {
      return res.status(400).json({
        success: false,
        message: "Target state is required to recover a rejected bill"
      });
    }
    
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({ 
        success: false, 
        message: "Bill not found" 
      });
    }
    
    if (bill.workflowState.currentState !== "Rejected") {
      return res.status(400).json({
        success: false,
        message: "Only bills in 'Rejected' state can be recovered"
      });
    }
    
    const recovered = bill.recoverFromRejected(targetState, actor, comments);
    if (!recovered) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot recover bill to state ${targetState}`
      });
    }
    
    await bill.save();
    
    return res.status(200).json({ 
      success: true, 
      message: `Bill recovered from Rejected state to ${targetState}`, 
      currentState: bill.workflowState.currentState,
      lastTransition: bill.workflowState.history[bill.workflowState.history.length - 1]
    });
    
  } catch (error) {
    console.error('Bill recovery error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to recover bill from rejected state",
      error: error.message 
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
        message: "Bill not found" 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      currentState: bill.workflowState.currentState,
      history: bill.workflowState.history,
      lastUpdated: bill.workflowState.lastUpdated
    });
    
  } catch (error) {
    console.error('Workflow history retrieval error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve workflow history",
      error: error.message 
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
      "Rejected"
    ];
    
    if (!validStates.includes(state)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid workflow state",
        validStates 
      });
    }
    
    const bills = await Bill.find({
      "workflowState.currentState": state
    })
    .select('srNo vendorName vendorNo amount status workflowState.lastUpdated')
    .sort({ "workflowState.lastUpdated": -1 });
    
    return res.status(200).json({ 
      success: true, 
      count: bills.length,
      data: bills
    });
    
  } catch (error) {
    console.error('Bills by state retrieval error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to retrieve bills by workflow state",
      error: error.message 
    });
  }
};

// Update workflow state
export const updateWorkflowState = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentState, comments } = req.body;
    
    // Validate the workflow state
    const validStates = [
      'Draft', 
      'Pending Review', 
      'Department Approval', 
      'Finance Approval', 
      'Payment Initiated', 
      'Completed', 
      'Rejected'
    ];
    
    if (!validStates.includes(currentState)) {
      return res.status(400).json({
        success: false,
        message: `Invalid workflow state. Must be one of: ${validStates.join(', ')}`
      });
    }
    
    // Find the bill
    const bill = await Bill.findById(id);
    
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found"
      });
    }
    
    // Store the previous state
    const previousState = bill.workflowState.currentState;
    
    // Determine action type
    let actionType = 'update';
    if (currentState === 'Rejected') {
      actionType = 'reject';
    } else if (
      validStates.indexOf(currentState) > validStates.indexOf(previousState) &&
      previousState !== currentState
    ) {
      actionType = 'forward';
    } else if (
      validStates.indexOf(currentState) < validStates.indexOf(previousState) &&
      previousState !== currentState
    ) {
      actionType = 'backward';
    }
    
    // Update the workflow state
    bill.workflowState = {
      currentState,
      previousState: bill.workflowState.currentState,
      lastUpdated: new Date(),
      comments: comments || ""
    };
    
    // Save the bill
    await bill.save();
    
    // Log the workflow transition
    await WorkflowTransition.recordTransition(
      bill, 
      previousState, 
      actionType, 
      req.user, 
      comments || '',
      { 
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        device: req.headers['user-agent'] // Could be improved with a proper device detection library
      }
    );
    
    return res.status(200).json({
      success: true,
      data: bill,
      message: `Bill workflow state updated to ${currentState}`
    });
    
  } catch (error) {
    console.error("Error updating workflow state:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update workflow state",
      error: error.message
    });
  }
};

// Method to regenerate serial numbers for all bills
export const regenerateAllSerialNumbers = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only administrators can perform this operation"
      });
    }

    const bills = await Bill.find({}).sort({ createdAt: 1 });
    
    console.log(`[Regenerate] Found ${bills.length} bills to process`);
    
    // Group bills by financial year
    const billsByFY = {};
    
    // Group each bill by financial year
    bills.forEach(bill => {
      if (!bill.billDate) {
        console.log(`[Regenerate] Skipping bill ${bill._id} - no bill date`);
        return;
      }
      
      const fyPrefix = getFinancialYearPrefix(new Date(bill.billDate));
      
      if (!billsByFY[fyPrefix]) {
        billsByFY[fyPrefix] = [];
      }
      
      billsByFY[fyPrefix].push(bill);
    });
    
    console.log(`[Regenerate] Bills grouped by financial years: ${Object.keys(billsByFY).join(', ')}`);
    
    // Process each financial year group
    const results = {};
    const errors = [];
    
    for (const [fyPrefix, fyBills] of Object.entries(billsByFY)) {
      results[fyPrefix] = {
        totalBills: fyBills.length,
        processedBills: 0,
        errorCount: 0
      };
      
      // Sort bills by date within each FY
      fyBills.sort((a, b) => new Date(a.billDate) - new Date(b.billDate));
      
      // Assign new serial numbers in sequence
      for (let i = 0; i < fyBills.length; i++) {
        const bill = fyBills[i];
        
        try {
          // Store old serial number
          bill.srNoOld = bill.srNo || null;
          
          // Create new serial number
          const serialNumber = i + 1;
          const serialFormatted = serialNumber.toString().padStart(4, '0');
          bill.srNo = `${fyPrefix}${serialFormatted}`;
          
          // Save bill
          await bill.save();
          results[fyPrefix].processedBills++;
          
          console.log(`[Regenerate] Updated bill ${bill._id}: ${bill.srNoOld || 'null'} → ${bill.srNo}`);
        } catch (error) {
          console.error(`[Regenerate] Error updating bill ${bill._id}:`, error);
          errors.push({ id: bill._id, error: error.message });
          results[fyPrefix].errorCount++;
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      message: "Serial number regeneration complete",
      results,
      errors: errors.length > 0 ? errors : null
    });
    
  } catch (error) {
    console.error('[Regenerate] Error regenerating serial numbers:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to regenerate serial numbers",
      error: error.message
    });
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
  advanceWorkflow,
  revertWorkflow,
  rejectBill,
  getWorkflowHistory,
  getBillsByWorkflowState,
  updateWorkflowState,
  recoverRejectedBill,
  patchBill,
  regenerateAllSerialNumbers
};

//helper functions ignore for now
// const buildDateRangeQuery = (startDate, endDate) => {
//     const dateQuery = {};
//     if (startDate) dateQuery.$gte = new Date(startDate);
//     if (endDate) dateQuery.$lte = new Date(endDate);
//     return dateQuery;
// };

// const buildAmountRangeQuery = (minAmount, maxAmount) => {
//     const amountQuery = {};
//     if (minAmount) amountQuery.$gte = Number(minAmount);
//     if (maxAmount) amountQuery.$lte = Number(maxAmount);
//     return amountQuery;
// };
