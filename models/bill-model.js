import mongoose from "mongoose";


//redundant master tables ko isme daal diya
const billSchema = new mongoose.Schema({
    srNo: { type: Number, auto: true },
    srNoOld: { type: Number, auto: true },
    typeOfInv: { type: String, required: true },
    projectDescription: { type: String, required: true },
    vendorNo: { type: String, required: true },
    vendorName: { type: String, required: true },
    gstNumber: { type: String, required: true },
    compliance206AB: { type: String, required: true },
    panStatus: { type: String, required: true },
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
    taxInvRecdAtSite: { type: Date },
    taxInvRecdBy: { type: String },
    department: { type: String },
    remarksBySiteTeam: { type: String },
    attachment: { type: String },
    advanceDate: { type: Date },
    advanceAmt: { type: Number },
    advancePercentage: { type: Number },
    advRequestEnteredBy: { type: String },
    qualityEngineer: { name: String, dateGiven: Date },
    qsInspection: { name: String, dateGiven: Date },
    qsMeasurementCheck: { name: String, dateGiven: Date },
    vendorFinalInv: { dateGiven: Date },
    qsCOP: { name: String, dateGiven: Date },
    copDetails: { date: Date, amount: Number },
    remarksByQSTeam: { type: String },
    migoDetails: { date: Date, no: String, amount: Number, doneBy: String },
    invReturnedToSite: { type: Date },
    siteEngineer: { name: String, dateGiven: Date },
    architect: { name: String, dateGiven: Date },
    siteIncharge: { name: String, dateGiven: Date },
    remarks: { type: String },
    siteOfficeDispatch: { name: String, dateGiven: Date },
    status: { type: String, enum: ["accept", "reject", "hold", "issue"] },
    pimoMumbai: { dateGiven: Date, dateReceived: Date, receivedBy: String },
    qsMumbai: { name: String, dateGiven: Date },
    itDept: { name: String, dateGiven: Date },
    sesDetails: { no: String, amount: Number, date: Date },
    approvalDetails: { 
        directorApproval: { dateGiven: Date, dateReceived: Date },
        remarksPimoMumbai: String
    },
    accountsDept: {
        dateGiven: Date,
        receivedBy: String,
        dateReceived: Date,
        returnedToPimo: Date,
        receivedBack: Date,
        paymentInstructions: String,
        remarksForPayInstructions: String,
        f110Identification: String,
        paymentDate: Date,
        accountsIdentification: String,
        paymentAmt: Number,
        remarksAcctsDept: String,
        status: { type: String, enum: ["paid", "unpaid"], default: "unpaid" }
    },
    billDate: { type: Date, required: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "VendorMaster", required: true },
    amount: { type: Number, required: true },
    currency: { 
        type: String, 
        enum: ["INR", "USD", "RMB", "EURO"],
        required: true
    },
    region: { 
        type: String, 
        enum: [
            "MUMBAI",
            "KHARGHAR",
            "AHMEDABAD",
            "BANGALURU",
            "BHUBANESHWAR",
            "CHANDIGARH",
            "DELHI",
            "NOIDA",
            "NAGPUR",
            "GANSOLI",
            "HOSPITAL",
            "DHULE",
            "SHIRPUR",
            "INDORE",
            "HYDERABAD"
        ],
        required: true
    },
    natureOfWork: { 
        type: String, 
        enum: [
            "Proforma Invoice",
            "Credit note",
            "Hold/Ret Release",
            "Direct FI Entry",
            "Advance/LC/BG",
            "Petty cash",
            "Imports",
            "Materials",
            "Equipments",
            "IT related",
            "IBMS",
            "Consultancy bill",
            "Civil Works",
            "STP Work",
            "MEP Work",
            "HVAC Work",
            "Fire Fighting Work",
            "Petrol/Diesel",
            "Painting work",
            "Utility Work",
            "Site Infra",
            "Carpentry",
            "Housekeeping/Security",
            "Overheads",
            "Others"
        ],
        required: true
    }
}, {timestamps: true});

const Bill = mongoose.model('Bill', billSchema);

export default Bill;