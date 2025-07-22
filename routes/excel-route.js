import express from "express";
import excelController from "../controllers/excel-controller.js";

const router = express.Router();

router.post("/generate-report", excelController.generateReport);

// Import bills from file route
router.post("/import-report", excelController.importBills);

// New route for patching bills through Excel uploads
router.post("/patch-bills", excelController.patchBillsFromExcel);

// Vendor master routes
router.post("/import-vendors", excelController.importVendors);
router.post("/update-vendor", excelController.updateVendorCompliance);

// // New route for fixing bill serial numbers
// router.post("/fix-serial-numbers", reportController.fixBillSerialNumbers);

// // Add a bulk fix route
// router.post("/bulk-fix-serial-numbers", reportController.bulkFixSerialNumbers);

export default router;
