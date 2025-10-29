import mongoose from "mongoose";
import RegionMaster from "./region-master-model.js";
import PanStatusMaster from "./pan-status-master-model.js";
import ComplianceMaster from "./compliance-master-model.js";

//redundant master tables ko isme daal diya
const billSchema = new mongoose.Schema(
  {
    srNo: {
      type: String,
      required: true,
      unique: true,
    },
    srNoOld: { type: Number, auto: true },
    // typeOfInv: {
    //     type: String,
    //     required: true,
    //     enum: [
    //         "Materials",
    //         "Credit note",
    //         "Advance/LC/BG",
    //         "Others",
    //         "Utility Work",
    //         "Proforma Invoice",
    //         "Hold/Ret Release",
    //         "HVAC Work"
    //     ]
    // },
    // Add workflow state information
    workflowState: {
      currentState: {
        type: String,
        // enum: [
        //     "Site_Officer",
        //     "Site_PIMO",
        //     "QS_Site",
        //     "PIMO_Mumbai",
        //     "Directors",
        //     "Accounts",
        //     "Completed",
        //     "Rejected",
        // ],
        enum: [
          "Site_Officer",
          "Quality_Inspector",
          "Quantity_Surveyor",
          "Architect",
          "Site_Engineer",
          "Site_Incharge",
          "Site_Central Officer",
          "Site_PIMO",
          "FI",
          "PIMO_Mumbai ",
          "QS_Mumbai",
          "IT_Office_Mumbai",
          "Trustees",
          "Accounts_Department",
          "Rejected",
          "Completed",
        ],
        default: "Site_Officer",
      },
      history: [
        {
          state: {
            type: String,

            enum: [
              "Site_Officer",
              "Quality_Inspector",
              "Quantity_Surveyor",
              "Architect",
              "Site_Engineer",
              "Site_Incharge",
              "Site_Central Officer",
              "Site_PIMO",
              "FI",
              "PIMO_Mumbai ",
              "QS_Mumbai",
              "IT_Office_Mumbai",
              "Trustees",
              "Accounts_Department",
              "Rejected",
              "Completed",
            ],
          },
          timestamp: { type: Date, default: Date.now },
          actor: { type: String },
          comments: { type: String },
          action: {
            type: String,
            enum: ["forward", "backward", "reject"],
          },
        },
      ],
      lastUpdated: { type: Date, default: Date.now },
    },
    projectDescription: { type: String, required: true },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorMaster",
      required: true,
    },
    // All vendor-related fields (vendorNo, vendorName, gstNumber, panStatus, compliance206AB)
    // are now derived from the vendor reference to ensure data consistency
    poCreated: { type: String, enum: ["Yes", "No"], required: true },
    poNo: { type: String },
    poDate: { type: Date },
    poAmt: { type: Number },
    proformaInvNo: { type: String },
    proformaInvDate: { type: Date },
    proformaInvAmt: { type: Number },
    proformaInvRecdAtSite: { type: Date },
    proformaInvRecdBy: { type: String },
    taxInvNo: { type: String },
    taxInvDate: { type: Date },
    taxInvAmt: { type: Number },
    taxInvRecdAtSite: { type: Date, required: true },
    taxInvRecdBy: { type: String },
    department: { type: String },
    remarksBySiteTeam: { type: String },
    attachment: { type: String },
    attachmentType: {
      type: String,
      enum: [
        "Invoice/Release",
        "Credit note/Debit Note",
        "Advance/LC/BG",
        "COP",
        "Proforma Invoice",
        "Others",
      ],
    },
    advanceDate: { type: Date },
    advanceAmt: { type: Number },
    advancePercentage: { type: Number },
    advRequestEnteredBy: { type: String },
    qualityEngineer: {
      name: { type: String },
      dateGiven: { type: Date },
    },
    qsInspection: {
      name: { type: String },
      dateGiven: { type: Date },
    },
    qsMeasurementCheck: {
      dateGiven: { type: Date },
    },
    vendorFinalInv: {
      name: { type: String },
      dateGiven: { type: Date },
    },
    qsCOP: {
      name: { type: String },
      dateGiven: { type: Date },
    },
    copDetails: {
      date: { type: Date },
      amount: { type: Number },
      dateReturned: { type: Date },
      remarks: { type: String },
    },
    remarksByQSTeam: { type: String },
    migoDetails: {
      date: { type: Date },
      no: { type: String },
      amount: { type: Number },
      doneBy: { type: String },
      dateGiven: { type: Date },
    },
    invReturnedToSite: { type: Date },
    siteEngineer: {
      name: { type: String },
      dateGiven: { type: Date },
    },
    architect: {
      name: { type: String },
      dateGiven: { type: Date },
    },
    siteIncharge: {
      name: { type: String },
      dateGiven: { type: Date },
    },
    remarks: { type: String },
    siteOfficeDispatch: {
      name: { type: String },
      dateGiven: { type: Date },
    },
    siteStatus: {
      type: String,
      enum: ["accept", "reject", "hold", "proforma"],
      required: true,
    },
    //2 api req-pimo (date given no date recieved), main pimo(both)
    pimoMumbai: {
      markReceived: {
        type: Boolean,
        default: false,
      },
      dateGiven: { type: Date },
      dateReceived: { type: Date }, //not autofill - they will see a tab of bills whose date pimo exists and they can recieve it, tab ka data store - then go to main dashboard
      receivedBy: { type: String },
      dateGivenPIMO: { type: Date },
      namePIMO: { type: String },
      dateGivenPIMO2: { type: Date },
      namePIMO2: { type: String },
      dateReceivedFromIT: { type: Date },
      dateReceivedFromPIMO: { type: Date },
      dateReturnedFromQs: { type: Date },
      dateReturnedFromDirector: { type: Date },
      dateReturnedFromSES: { type: Date }, // added for SES return tracking
    },
    qsMumbai: {
      name: { type: String },
      dateGiven: { type: Date },
    },
    itDept: {
      name: { type: String },
      dateGiven: { type: Date },
      dateReceived: { type: Date },
    },
    sesDetails: {
      no: { type: String },
      amount: { type: Number },
      dateGiven: { type: Date },
      doneBy: { type: String },
      name: { type: String },
      date: { type: Date },
    },
    approvalDetails: {
      directorApproval: {
        //todo : date received tab hoga tab accept karenge uska api banao
        dateGiven: { type: Date },
        dateReceived: { type: Date },
      },
      remarksPimoMumbai: { type: String },
    },
    // same logic as pimo mumbai, 2 apis - one for date given and one for date received
    accountsDept: {
      markReceived: {
        type: Boolean,
        default: false,
      },
      dateGiven: { type: Date },
      givenBy: { type: String },
      receivedBy: { type: String },
      dateReceived: { type: Date },
      returnedToPimo: { type: Date },
      receivedBack: { type: Date },
      invBookingChecking: { type: String },
      paymentInstructions: { type: String },
      remarksForPayInstructions: { type: String },
      f110Identification: { type: String },
      paymentDate: { type: Date },
      hardCopy: { type: String },
      accountsIdentification: { type: String },
      paymentAmt: { type: Number },
      remarksAcctsDept: { type: String },
      status: {
        type: String,
        enum: ["Paid", "Unpaid"],
        default: "Unpaid",
      },
    },
    // MIRO details for Accounts Team
    miroDetails: {
      number: { type: String }, // MIRO no
      date: { type: Date }, // MIRO Dt
      amount: { type: Number }, // MIRO Amt
    },
    billDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    currency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CurrencyMaster",
      required: true,
    },
    region: {
      type: String,
      required: [true, "Region is required"],
      validate: {
        validator: async function (value) {
          if (!value) return false;
          const region = await RegionMaster.findOne({
            name: value.toUpperCase(),
          });
          if (!region) {
            throw new Error(`Region '${value}' does not exist in RegionMaster`);
          }
          return true;
        },
        message: (props) =>
          `Region '${props.value}' does not exist in RegionMaster`,
      },
    },
    natureOfWork: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NatureOfWorkMaster",
      required: true,
    },
    maxCount: {
      type: Number,
      default: 1,
    },
    currentCount: {
      type: Number,
      default: 1,
    },
    // compliance206AB field removed - now populated from vendor.complianceStatus
    attachments: [
      {
        fileName: { type: String },
        fileKey: { type: String },
        fileUrl: { type: String },
      },
    ],
  },
  { timestamps: true }
);

//Deleteeeeee

// Function to get financial year prefix
// const getFinancialYearPrefix = (date) => {
//     const d = date || new Date();
//     let currentYear = d.getFullYear().toString().substr(-2);
//     if (d.getMonth() >= 3) {
//         console.log("Current Year:", currentYear);
//         return `${currentYear}`;
//     } else {
//         let prevYear = (parseInt(currentYear) - 1).toString().padStart(2, "0");
//         console.log("Previous Year:", prevYear);
//         return `${prevYear}`;
//     }
// };

// // Pre-save hook to handle workflow state changes and other validations
// billSchema.pre("save", async function (next) {

//     // Format the srNo for imported bills
//     // Explicitly check that import mode is true (boolean) before applying import formatting
//     if (this.srNo && this._importMode === true) {
//         // Extract numeric part if srNo is not already numeric
//         let numericPart;
//         if (typeof this.srNo === "string") {
//             numericPart = this.srNo.replace(/\D/g, "");
//         } else {
//             numericPart = String(this.srNo);
//         }

//         // Get the current financial year prefix
//         const fyPrefix = getFinancialYearPrefix(this.billDate);

//         // Format with financial year prefix and padded to ensure at least 5 digits
//         this.srNo = `${fyPrefix}${numericPart.padStart(5, "0")}`;
//         console.log(`[Pre-save] Formatted imported srNo: ${this.srNo}`);
//     }

//     // Ensure region is always uppercase for consistency
//     if (this.region) {
//       if (Array.isArray(this.region)) {
//         this.region = this.region.map(r => r.toUpperCase());
//         console.log(
//           `[Pre-save] Normalized regions: "${this.region.join(", ")}"`
//         );
//       } else {
//         const originalRegion = this.region;
//         this.region = this.region.toUpperCase();
//         console.log(
//           `[Pre-save] Normalized region: "${originalRegion}" → "${this.region}"`
//         );
//       }
//     }

//     // Auto-update payment status to 'Paid' when payment date is added
//     if (this.accountsDept && this.accountsDept.paymentDate) {
//         if (!this.accountsDept.status || this.accountsDept.status !== "Paid") {
//             console.log(
//                 "[Pre-save] Auto-updating payment status to Paid based on payment date"
//             );
//             this.accountsDept.status = "Paid";
//         }
//     } else if (this.accountsDept && !this.accountsDept.status) {
//         // Default payment status is Unpaid if not specified
//         this.accountsDept.status = "Unpaid";
//     }

//     // Fix any date fields that are in string format
//     if (this._importMode) {
//         // Find all date fields in the schema and convert strings to Date objects
//         Object.keys(this.schema.paths).forEach((path) => {
//             const schemaType = this.schema.paths[path];

//             // Only process Date fields
//             if (schemaType.instance === "Date") {
//                 const value = this.get(path);

//                 // If it's a string, try to convert it or set to null
//                 if (typeof value === "string") {
//                     try {
//                         console.log(
//                             `[Pre-save] Converting string date for ${path}: "${value}"`
//                         );

//                         // First, try built-in Date parsing
//                         const dateObj = new Date(value);

//                         if (!isNaN(dateObj.getTime())) {
//                             this.set(path, dateObj);
//                             console.log(
//                                 `[Pre-save] Converted ${path} to Date: ${dateObj}`
//                             );
//                         } else {
//                             // If DD-MM-YYYY format, try manual parsing
//                             if (value.includes("-")) {
//                                 const parts = value.split("-");
//                                 if (parts.length === 3) {
//                                     const [day, month, year] = parts;
//                                     const parsedDate = new Date(
//                                         parseInt(year, 10),
//                                         parseInt(month, 10) - 1,
//                                         parseInt(day, 10)
//                                     );

//                                     if (!isNaN(parsedDate.getTime())) {
//                                         this.set(path, parsedDate);
//                                         console.log(
//                                             `[Pre-save] Manually converted ${path} to Date: ${parsedDate}`
//                                         );
//                                         return; // Continue to next field
//                                     }
//                                 }
//                             }

//                             // If all parsing fails, set to null
//                             console.log(
//                                 `[Pre-save] Could not parse date for ${path}, setting to null`
//                             );
//                             this.set(path, null);
//                         }
//                     } catch (error) {
//                         console.error(
//                             `[Pre-save] Error converting date for ${path}:`,
//                             error
//                         );
//                         this.set(path, null);
//                     }
//                 }
//             }
//         });
//     }
//     // console.log("DEBUG1:",this.workflowState);
//     // Update workflow lastUpdated timestamp whenever the document is saved

//     next();
// });

// // Method to advance to the next state in the workflow
// billSchema.methods.moveToNextState = function (actor, comments = "") {
//     const stateOrder = [
//         "Site_Officer",
//         "Site_PIMO",
//         "QS_Site",
//         "PIMO_Mumbai",
//         "Directors",
//         "Accounts",
//         "Completed",
//     ];
//     const currentIndex = stateOrder.indexOf(this.workflowState.currentState);

//     if (currentIndex < stateOrder.length - 1) {
//         const nextState = stateOrder[currentIndex + 1];

//         // Record the transition in history
//         this.workflowState.history.push({
//             state: nextState,
//             timestamp: new Date(),
//             actor: actor,
//             comments: comments,
//             action: "forward",
//         });

//         // Update current state
//         this.workflowState.currentState = nextState;
//         this.workflowState.lastUpdated = new Date();

//         // Update role-specific fields based on the new state
//         this.updateRoleSpecificFields(actor, comments, nextState);

//         console.log(
//             `[Workflow] Advanced from ${stateOrder[currentIndex]} to ${nextState}`
//         );
//         return true;
//     }

//     return false;
// };

// // Method to go back to the previous state in the workflow
// billSchema.methods.moveToPreviousState = function (actor, comments = "") {
//     const stateOrder = [
//         "Site_Officer",
//         "Site_PIMO",
//         "QS_Site",
//         "PIMO_Mumbai",
//         "Directors",
//         "Accounts",
//         "Completed",
//     ];
//     const currentIndex = stateOrder.indexOf(this.workflowState.currentState);

//     if (currentIndex > 0) {
//         const prevState = stateOrder[currentIndex - 1];

//         // Record the transition in history
//         this.workflowState.history.push({
//             state: prevState,
//             timestamp: new Date(),
//             actor: actor,
//             comments: comments,
//             action: "backward",
//         });

//         // Update current state
//         this.workflowState.currentState = prevState;
//         this.workflowState.lastUpdated = new Date();

//         // Update role-specific fields based on the new state
//         this.updateRoleSpecificFields(actor, comments, prevState, "backward");

//         console.log(
//             `[Workflow] Reverted from ${stateOrder[currentIndex]} to ${prevState}`
//         );
//         return true;
//     }

//     return false;
// };

// // Method to reject the bill at any point in the workflow
// billSchema.methods.rejectBill = function (actor, comments = "") {
//     const previousState = this.workflowState.currentState;

//     // Record the rejection in history
//     this.workflowState.history.push({
//         state: "Rejected",
//         timestamp: new Date(),
//         actor: actor,
//         comments: comments,
//         action: "reject",
//     });

//     // Store rejection reason in remarks field based on previous state
//     if (previousState === "Site_Officer" || previousState === "Site_PIMO") {
//         this.remarksBySiteTeam =
//             (this.remarksBySiteTeam || "") + "\nRejection: " + comments;
//     } else if (previousState === "QS_Site") {
//         this.remarksByQSTeam =
//             (this.remarksByQSTeam || "") + "\nRejection: " + comments;
//     } else if (previousState === "PIMO_Mumbai") {
//         this.approvalDetails = this.approvalDetails || {};
//         this.approvalDetails.remarksPimoMumbai =
//             (this.approvalDetails.remarksPimoMumbai || "") +
//             "\nRejection: " +
//             comments;
//     } else if (previousState === "Directors") {
//         this.approvalDetails = this.approvalDetails || {};
//         this.approvalDetails.remarksPimoMumbai =
//             (this.approvalDetails.remarksPimoMumbai || "") +
//             "\nDirector Rejection: " +
//             comments;
//     } else if (previousState === "Accounts") {
//         this.accountsDept = this.accountsDept || {};
//         this.accountsDept.remarksAcctsDept =
//             (this.accountsDept.remarksAcctsDept || "") +
//             "\nRejection: " +
//             comments;
//     }

//     // Update status field
//     this.status = "reject";

//     // Update current state
//     this.workflowState.currentState = "Rejected";
//     this.workflowState.lastUpdated = new Date();

//     console.log(`[Workflow] Rejected bill from state ${previousState}`);
//     return true;
// };

// // New method to recover a rejected bill and bring it back to a specific state
// billSchema.methods.recoverFromRejected = function (
//     targetState,
//     actor,
//     comments = ""
// ) {
//     if (this.workflowState.currentState !== "Rejected") {
//         console.log("[Workflow] Cannot recover: bill is not in Rejected state");
//         return false;
//     }

//     const stateOrder = [
//         "Site_Officer",
//         "Site_PIMO",
//         "QS_Site",
//         "PIMO_Mumbai",
//         "Directors",
//         "Accounts",
//         "Completed",
//     ];

//     if (!stateOrder.includes(targetState)) {
//         console.log(
//             `[Workflow] Cannot recover: invalid target state ${targetState}`
//         );
//         return false;
//     }

//     // Get the state that rejected the bill (if available)
//     let previousState = "Site_Officer"; // Default fallback

//     // Find the last non-rejected state from history
//     if (this.workflowState.history && this.workflowState.history.length > 0) {
//         for (let i = this.workflowState.history.length - 1; i >= 0; i--) {
//             if (this.workflowState.history[i].state !== "Rejected") {
//                 previousState = this.workflowState.history[i].state;
//                 break;
//             }
//         }
//     }

//     // Record the recovery in history
//     this.workflowState.history.push({
//         state: targetState,
//         timestamp: new Date(),
//         actor: actor,
//         comments: comments,
//         action: "backward", // Treat recovery as a backward action
//     });

//     // Update current state
//     this.workflowState.currentState = targetState;
//     this.workflowState.lastUpdated = new Date();

//     // Update status to accept (undoing the reject status)
//     this.status = "accept";

//     // Update role-specific fields based on the new state
//     this.updateRoleSpecificFields(actor, comments, targetState, "recovery");

//     console.log(
//         `[Workflow] Recovered bill from Rejected state to ${targetState}`
//     );
//     return true;
// };

// // Helper method to update role-specific fields based on workflow state
// billSchema.methods.updateRoleSpecificFields = function (
//     actor,
//     comments,
//     state,
//     action = "forward"
// ) {
//     const now = new Date();

//     switch (state) {
//         case "Site_Officer":
//             // Update Site Officer specific fields
//             this.remarksBySiteTeam =
//                 action === "forward"
//                     ? comments
//                     : (this.remarksBySiteTeam || "") + "\nUpdate: " + comments;
//             break;

//         case "Site_PIMO":
//             // Update Site PIMO specific fields
//             if (action === "forward") {
//                 // When moving to Site_PIMO from Site_Officer
//                 this.siteOfficeDispatch = this.siteOfficeDispatch || {};
//                 this.siteOfficeDispatch.name = actor;
//                 this.siteOfficeDispatch.dateGiven = now;
//                 this.remarks = comments;
//             }
//             break;

//         case "QS_Site":
//             // Update QS Site specific fields
//             if (action === "forward") {
//                 // When moving to QS_Site
//                 this.qsInspection = this.qsInspection || {};
//                 this.qsInspection.dateGiven = now;
//                 this.qsInspection.name = actor;
//             }
//             this.remarksByQSTeam =
//                 action === "forward"
//                     ? comments
//                     : (this.remarksByQSTeam || "") + "\nUpdate: " + comments;
//             break;

//         case "PIMO_Mumbai":
//             // Update PIMO Mumbai specific fields
//             if (action === "forward") {
//                 this.pimoMumbai = this.pimoMumbai || {};
//                 this.pimoMumbai.dateGiven = now;
//                 this.pimoMumbai.receivedBy = actor;
//             }
//             this.approvalDetails = this.approvalDetails || {};
//             this.approvalDetails.remarksPimoMumbai =
//                 action === "forward"
//                     ? comments
//                     : (this.approvalDetails.remarksPimoMumbai || "") +
//                       "\nUpdate: " +
//                       comments;
//             break;

//         case "Directors":
//             // Update Directors specific fields
//             if (action === "forward") {
//                 this.approvalDetails = this.approvalDetails || {};
//                 this.approvalDetails.directorApproval =
//                     this.approvalDetails.directorApproval || {};
//                 this.approvalDetails.directorApproval.dateGiven = now;
//             }
//             break;

//         case "Accounts":
//             // Update Accounts specific fields
//             if (action === "forward") {
//                 this.accountsDept = this.accountsDept || {};
//                 this.accountsDept.dateGiven = now;
//                 this.accountsDept.givenBy = actor;
//             }
//             if (this.accountsDept) {
//                 this.accountsDept.remarksAcctsDept =
//                     action === "forward"
//                         ? comments
//                         : (this.accountsDept.remarksAcctsDept || "") +
//                           "\nUpdate: " +
//                           comments;
//             }
//             break;

//         case "Completed":
//             // Update completion specific fields
//             if (action === "forward" && this.accountsDept) {
//                 this.accountsDept.status = "Paid";
//             }
//             break;
//     }
// };

// Improve setImportMode method
billSchema.methods.setImportMode = function (isImport) {
  // Explicitly convert to boolean to prevent any "truthy" values from causing issues
  this._importMode = isImport === true;
  // console.log(
  //   `[Bill] Import mode ${this._importMode ? "enabled" : "disabled"}`
  // );
};

const Bill = mongoose.model("Bill", billSchema);

export default Bill;
