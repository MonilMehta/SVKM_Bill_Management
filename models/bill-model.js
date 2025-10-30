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


// Improve setImportMode method
billSchema.methods.setImportMode = function (isImport) {
  // Explicitly convert to boolean to prevent any "truthy" values from causing issues
  this._importMode = isImport === true;

};

const Bill = mongoose.model("Bill", billSchema);

export default Bill;
