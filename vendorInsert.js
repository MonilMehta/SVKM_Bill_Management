import mongoose from "mongoose";
import VendorMaster from "./models/vendor-master-model.js";

// Array of vendor names as provided
const vendorNames = [
  "Signature Interior Pvt Ltd",
  "Varun Enterprises",
  "M V Patel And Company",
  "Vittoria Designs Pvt Ltd",
  "Arihant Alu Glass Systom Pvt Ltd",
  "J K Corporation",
  "Arihant Alu Glass Systom Pvt Ltd",
  "G K Enterprises",
  "Satguru Enterprise",
  "G K Enterprises",
  "G K Enterprises",
  "Satguru Enterprise",
  "G K Enterprises",
  "PRATHAM INTERIORS",
  "Aimco Stones",
  "FORMTECH INFRA PVT LTD",
  "RAGHAVENDRA ELECTRICAL ENGINEERS",
  "SRI ASHOKA MARKETING SERVICES",
  "Premiere Electrical Solutions LLP",
  "J K Corporation",
  "KRISHNA TRADELINKS",
  "Shirish Sadanand Malvankar",
  "SIMI BHATIA",
  "J K Corporation",
  "Zubair Water Proofing Co",
  "SARA TIMBER ASSOCIATES",
  "THE INDIAN PLYWOOD MANUFACTURING CO. P.",
  "PAMBALA MALLESHAM",
  "MEGATECH SOLUTIONS",
  "Khushi Distributors",
  `"MGB MOTOR AND AUTO AGENCIES
PRIVATE LIMITED"`,
  "G.M. INTERIORS",
  `"MGB MOTOR AND AUTO AGENCIES
PRIVATE LIMITED"`,
  `"MGB MOTOR AND AUTO AGENCIES
PRIVATE LIMITED"`,
  `"MGB MOTOR AND AUTO AGENCIES
PRIVATE LIMITED"`,
  "Satguru Enterprise",
  "HOSMAC INDIA PRIVATE LIMITED",
  "M/S. M.C.C. ASSOCIATES",
  "ALPHA CONSTRUCTION",
  "ALPHA CONSTRUCTION",
  "MAKWANA ASSOCIATES",
  "Microline India Pvt ltd",
  "Khushi Distributors",
  "Khushi Distributors",
  "Khushi Distributors",
  "Shree Ram Mega Structure Pvt Ltd",
  "SAMA ARTS",
  "SAIF GLAZIERS-GST Issue",
  "Trikaya Gypsum-GST Issue",
  "Lustre Glass",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "SNB Infrastructure Pvt Ltd",
  "Powerica Limited",
  "VIBRANT DESIGNS PRIVATE LIMITED",
  "Mehta Design Associates    (MeDesA)",
  "Powerica Limited",
  "Simero Vitrified Pvt Ltd",
  "Khushi Distributors",
  "Khushi Distributors",
  "Khushi Distributors",
  "DORMAKABA INDIA PRIVATE LIMITED",
  "Simero Vitrified Pvt Ltd",
  "TRINITY HEALTHTECH (A DIV OF THTPL)",
  "Satguru Enterprise",
  "VIBRANT DESIGNS PRIVATE LIMITED",
  "VIBRANT DESIGNS PRIVATE LIMITED",
  "VIBRANT DESIGNS PRIVATE LIMITED",
  "Signature Interior Pvt Ltd",
  "MAKWANA ASSOCIATES",
  "VIBRANT DESIGNS PRIVATE LIMITED",
  "Premiere Electrical Solutions LLP",
  "Simero Vitrified Pvt Ltd",
  "GREENLAM INDUSTRIES LIMITED",
  "Microware Communications",
  "Khushi Distributors",
  "SWASTIK GLASS INDUSTRIES",
  "Microware Communications",
  "MAKWANA ASSOCIATES",
  "Mehta Design Associates    (MeDesA)",
  "KEEC (I) Private Limited",
  "Vittoria Designs Pvt Ltd",
  "Aimco Stones",
  "VENKATESHWARA IRRIGATION SERVICE",
  "J K Corporation",
  "J K Corporation",
  "BOMBAY INTEGRATED SECURITY (INDIA) LIMIT",
  "NORTHCONS REALTORS LLP",
  `"MGB MOTOR AND AUTO AGENCIES
PRIVATE LIMITED"`,
  "S.B.INTERIOR",
  "APEX INTERIOR & FAÇADE",
  "TRANSLOT LOGISTICS",
  "Ravi Traders",
  "SAIF GLAZIERS-GST Issue",
  "Satguru Enterprise",
  "Satguru Enterprise",
  "Satguru Enterprise",
  "EXPERT KARIGHAR",
  "AYAANA CONSTRUCTION AND DEVELOPERS",
  "Kombination",
  "Pravin Gala Consultants Pvt. Ltd",
  "B PLUS AC PRIVATE LIMITED",
  "B PLUS AC PRIVATE LIMITED",
  "B PLUS AC PRIVATE LIMITED",
  "BASANT BETONS",
  "BASANT BETONS",
  "Khushi Distributors",
  "AQUA CARE SOLUTIONS",
  "NARAYAN BUILDCON",
  "JANSHA SOLUTIONS",
  "Kombination",
  "HARISH CHANDRU",
  "Sachin Enterprises",
  "HARISH CHANDRU",
  "Ego Wall Decor Pvt Ltd",
  "J K Corporation",
  "MOHINI WIRES & CABLES",
  "SATISH ENTERPRISES PVT. LTD.",
  "GREENLAM INDUSTRIES LIMITED",
  "GREENLAM INDUSTRIES LIMITED",
  "Bhairav Enterprises",
  "R N INDUSTRIAL ELECTRICALS PVT LTD",
  "Eagle Techsec Communications India Pvt Ltd",
  "Bhairav Enterprises",
  "Bhairav Enterprises",
  "Bhairav Enterprises",
  "Bhairav Enterprises",
  "Bhairav Enterprises",
  "Surendra Interior-GST Issue",
  "VARUN ENTERPRISES",
  "Aimco Stones",
  "PRATHAM INTERIORS",
  "SAIF GLAZIERS-GST Issue",
  "SIDDHARTH  ALUMINIUM",
  "Tameer Consulting Associates",
  "Tameer Consulting Associates",
  "NORTHCONS REALTORS LLP",
  "D C ENTERPRISE",
  "PAGARIYA HOMES",
  "Zion Lights",
  "MAKWANA ASSOCIATES",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "EXPERT KARIGHAR",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "MAHARASHTRA ALUMINIUM CENTRE",
  "KRISHNA ENTERPRISES",
  "Godrej & Boyce Mfg Co Ltd",
  "Godrej & Boyce Mfg Co Ltd",
  "RAGHAVENDRA ELECTRICAL ENGINEERS",
  "Kombination",
  "Kombination",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "Sai Ganesh Enterprise",
  "Beyond Green",
  "MAKWANA ASSOCIATES",
  "LMK & ASSOCIATES",
  "Simero Vitrified Pvt Ltd",
  "Simero Vitrified Pvt Ltd",
  "Premiere Electrical Solutions LLP",
  "Premiere Electrical Solutions LLP",
  "Premiere Electrical Solutions LLP",
  "Premiere Electrical Solutions LLP",
  "Amoda Parisar Telbiya Utpadak Sahakari Sanstha Ltd.",
  "NK ELECTRICAL AGENCIES PVT LTD",
  "GLEEDS CONSULTING (INDIA) PRIVATE LIMITED",
  "PSP Projects Limited",
  "SPORTS FACILITIES CO PVT LTD",
  "MAKWANA ASSOCIATES",
  "MAKWANA ASSOCIATES",
  "MAKWANA ASSOCIATES",
  "MAKWANA ASSOCIATES",
  "MAKWANA ASSOCIATES",
  "SATISH ENTERPRISES PVT. LTD.",
];

const distinctVendorNames = [...new Set(vendorNames)]; // compute distinct names
// const highestVendor = await VendorMaster.findOne().sort({ vendorNo: -1 });
// let startId = highestVendor ? highestVendor.vendorNo + 1 : 1;
    
// Map each distinct vendor name to a vendor object with defaults for other fields
const vendors = distinctVendorNames.map((name, idx) => ({
  vendorNo: idx + 1,
  vendorName: name,
  PAN: "Not Provided",
  GSTNumber: "Not Provided",
  complianceStatus: "Not Provided",
  PANStatus: "Not Provided",
  emailIds: [],
  phoneNumbers: []
}));

async function seedVendors() {
  try {
    await mongoose.connect("mongodb+srv://monilmehta5:Pass123@paytmcohort.xjxam.mongodb.net/test");
    await VendorMaster.insertMany(vendors);
    console.log("Vendors added successfully.");
  } catch (err) {
    console.error("Error adding vendors:", err);
  } finally {
    await mongoose.connection.close();
  }
}

seedVendors();