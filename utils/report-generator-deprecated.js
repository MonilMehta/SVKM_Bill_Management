import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import Bill from "../models/bill-model.js";
import { Parser } from "json2csv";

// Utility to flatten bill object with nested fields
const flattenBill = (bill) => {
  const flatten = (obj, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix ? `${prefix}.` : '';
      if (typeof obj[k] === 'object' && obj[k] !== null && !(obj[k] instanceof Date)) {
        Object.assign(acc, flatten(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };
 
  const { _id, ...rest } = bill;
  return flatten(rest);
};

// Excel Report - SIMPLIFIED VERSION
// NOTE: Complex Excel report formatting has been delegated to the frontend
// This version provides basic data export without complex formatting
export const generateExcelReport = async (billIds) => {
  const bills = await Bill.find({ _id: { $in: billIds } }).lean();
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bills Report");
  
  // Define basic columns - frontend will handle specific formatting and headers
  if (bills.length > 0) {
    // Use the keys from the first bill to create columns
    const flattenedBill = flattenBill(bills[0]);
    const columns = Object.keys(flattenedBill).map(key => ({
      header: key,
      key: key,
      width: 20
    }));
    
    worksheet.columns = columns;
    
    // Simple header formatting
    worksheet.getRow(1).font = { bold: true };
    
    // Add data rows
    bills.forEach(bill => {
      worksheet.addRow(flattenBill(bill));
    });
  } else {
    // If no bills, add a placeholder row
    worksheet.columns = [
      { header: 'No Data', key: 'noData', width: 20 }
    ];
    worksheet.addRow({ noData: 'No bills found with the provided IDs' });
  }
  
  return workbook.xlsx.writeBuffer();
};

/*
 * ORIGINAL EXCEL REPORT GENERATION CODE - COMMENTED OUT
 * This functionality has been delegated to the frontend
 * The code below is kept for reference purposes only
 */
/*
export const generateExcelReport = async (billIds) => {
  const bills = await Bill.find({ _id: { $in: billIds } }).lean();
  // console.log("Total bills : ", bills.length);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bills Report");
  
  // Define columns with custom headers
  const columnsConfig = [
    { field: "srNo", header: "Sr no" },
    { field: "typeOfInv", header: "Type of inv" },
    { field: "region", header: "Region" },
    { field: "projectDescription", header: "Project Description" },
    { field: "vendorNo", header: "Vendor no" },
    { field: "vendorName", header: "Vendor Name" },
    { field: "gstNumber", header: "GST Number" },
    { field: "compliance206AB", header: "206AB Compliance" },
    { field: "panStatus", header: "PAN Status" },
    { field: "poCreated", header: "If PO created??" },
    { field: "poNo", header: "PO no" },
    { field: "poDate", header: "PO Dt" },
    { field: "poAmt", header: "PO Amt" },
    { field: "proformaInvNo", header: "Proforma Inv No" },
    { field: "proformaInvDate", header: "Proforma Inv Dt" },
    { field: "proformaInvAmt", header: "Proforma Inv Amt" },
    { field: "proformaInvRecdAtSite", header: "Proforma Inv Recd at site" },
    { field: "proformaInvRecdBy", header: "Proforma Inv Recd by" },
    { field: "taxInvNo", header: "Tax Inv no" },
    { field: "taxInvDate", header: "Tax Inv Dt" },
    { field: "currency", header: "Currency" },
    { field: "taxInvAmt", header: "Tax Inv Amt" },
    { field: "taxInvRecdAtSite", header: "Tax Inv Recd at site" },
    { field: "taxInvRecdBy", header: "Tax Inv Recd by" },
    { field: "department", header: "Department" },
    { field: "remarksBySiteTeam", header: "Remarks by Site Team" },
    { field: "attachment", header: "Attachment" },
    { field: "attachmentType", header: "Attachment Type" },
    { field: "advanceDate", header: "Advance Dt" },
    { field: "advanceAmt", header: "Advance Amt" },
    { field: "advancePercentage", header: "Advance Percentage" },
    { field: "advRequestEnteredBy", header: "Adv request entered by" },
    { field: "qualityEngineer.dateGiven", header: "Dt given to Quality Engineer" },
    { field: "qualityEngineer.name", header: "Name of Quality Engineer" },
    { field: "qsInspection.dateGiven", header: "Dt given to QS for Inspection" },
    { field: "qsInspection.name", header: "Name of QS Checked" },
    { field: "qsMeasurementCheck.dateGiven", header: "by QS with Dt of Measurment" },
    { field: "vendorFinalInv.dateGiven", header: "Given to vendor-Query/Final Inv" },
    { field: "qsCOP.name", header: "Name of QS" },
    { field: "qsCOP.dateGiven", header: "Dt given to QS for COP" },
    { field: "copDetails.name", header: "Name - QS COP" },
    { field: "copDetails.date", header: "Dt" },
    { field: "copDetails.amount", header: "COP Amt" },
    { field: "remarksByQSTeam", header: "Remarks by QS Team" },
    { field: "migoDetails.dateGiven", header: "Dt given for MIGO" },
    { field: "migoDetails.no", header: "MIGO no" },
    { field: "migoDetails.date", header: "MIGO Dt" },
    { field: "migoDetails.amount", header: "MIGO Amt" },
    { field: "migoDetails.doneBy", header: "Migo done by" },
    { field: "invReturnedToSite", header: "Dt-Inv returned to Site office" },
    { field: "siteEngineer.dateGiven", header: "Dt given to Site Engineer" },
    { field: "siteEngineer.name", header: "Name of Site Engineer" },
    { field: "architect.dateGiven", header: "Dt given to Architect" },
    { field: "architect.name", header: "Name of Architect" },
    { field: "siteIncharge.dateGiven", header: "Dt given-Site Incharge" },
    { field: "siteIncharge.name", header: "Name-Site Incharge" },
    { field: "remarks", header: "Remarks" },
    { field: "siteOfficeDispatch.dateGiven", header: "Dt given to Site Office for dispatch" },
    { field: "siteOfficeDispatch.name", header: "Name-Site Office" },
    { field: "status", header: "Status" },
    { field: "pimoMumbai.dateGiven", header: "Dt given to PIMO Mumbai" },
    { field: "pimoMumbai.dateReceived", header: "Dt recd at PIMO Mumbai" },
    { field: "pimoMumbai.receivedBy", header: "Name recd by PIMO Mumbai" },
    { field: "qsMumbai.dateGiven", header: "Dt given to QS Mumbai" },
    { field: "qsMumbai.name", header: "Name of QS" },
    { field: "pimoMumbai.dateGivenPIMO", header: "Dt given to PIMO Mumbai" },
    { field: "pimoMumbai.namePIMO", header: "Name -PIMO" },
    { field: "itDept.dateGiven", header: "Dt given to IT Dept" },
    { field: "itDept.name", header: "Name- given to IT Dept" },
    { field: "pimoMumbai.dateGivenPIMO2", header: "Dt given to PIMO Mumbai" },
    { field: "pimoMumbai.namePIMO2", header: "Name-given to PIMO" },
    { field: "sesDetails.no", header: "SES no" },
    { field: "sesDetails.amount", header: "SES Amt" },
    { field: "sesDetails.date", header: "SES Dt" },
    { field: "sesDetails.doneBy", header: "SES done by" },
    { field: "itDept.dateReceived", header: "Dt recd from IT Deptt" },
    { field: "pimoMumbai.dateReceivedFromPIMO", header: "Dt recd from PIMO" },
    { field: "approvalDetails.directorApproval.dateGiven", header: "Dt given to Director/Advisor/Trustee for approval" },
    { field: "approvalDetails.directorApproval.dateReceived", header: "Dt recd back in PIMO after approval" },
    { field: "approvalDetails.remarksPimoMumbai", header: "Remarks PIMO Mumbai" },
    { field: "accountsDept.dateGiven", header: "Dt given to Accts dept" },
    { field: "accountsDept.givenBy", header: "Name -given by PIMO office" },
    { field: "accountsDept.dateReceived", header: "Dt recd in Accts dept" },
    { field: "accountsDept.receivedBy", header: "Name recd by Accts dept" },
    { field: "accountsDept.returnedToPimo", header: "Dt returned back to PIMO" },
    { field: "accountsDept.receivedBack", header: "Dt recd back in Accts dept" },
    { field: "accountsDept.invBookingChecking", header: "Inv given for booking and checking" },
    { field: "accountsDept.paymentInstructions", header: "Payment instructions" },
    { field: "accountsDept.remarksForPayInstructions", header: "Remarks for pay instructions" },
    { field: "accountsDept.f110Identification", header: "F110 Identification" },
    { field: "accountsDept.paymentDate", header: "Dt of Payment" },
    { field: "accountsDept.hardCopy", header: "Hard Copy" },
    { field: "accountsDept.accountsIdentification", header: "Accts Identification" },
    { field: "accountsDept.paymentAmt", header: "Payment Amt" },
    { field: "accountsDept.remarksAcctsDept", header: "Remarks Accts dept" },
    { field: "accountsDept.status", header: "Status" }
  ];
  
  // Set Excel columns
  const columns = columnsConfig.map(col => ({
    header: col.header,
    key: col.field,
    width: Math.min(Math.max(col.header.length * 1.5, 15), 30) // Width based on header length
  }));
  
  worksheet.columns = columns;
  
  // Enhanced header styling
  worksheet.getRow(1).eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Add data with improved formatting
  bills.forEach((bill, index) => {
    const flatBill = flattenBill(bill);
    const rowData = {};
    
    // Initialize srNo field
    rowData.srNo = index + 1;
    
    // Add all other fields from the flattened bill
    columnsConfig.forEach(col => {
      if (col.field !== 'srNo') {
        rowData[col.field] = flatBill[col.field] !== undefined ? flatBill[col.field] : '';
      }
    });
    
    const row = worksheet.addRow(rowData);
    
    // Alternate row colors for better readability
    if (index % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      });
    }
  });
  
  // Enhanced cell formatting
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
          right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        if (typeof cell.value === 'number') {
          cell.numFmt = cell.value % 1 === 0 ? '#,##0' : '#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
        if (cell.value instanceof Date) {
          cell.numFmt = 'dd-mmm-yyyy';
        }
      });
    }
  });
  
  // Freeze the header row
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }
  ];
  
  return workbook.xlsx.writeBuffer();
};
*/

// PDF Report - One bill per page with improved layout
export const generatePDFReport = async (billIds) => {
  const bills = await Bill.find({ _id: { $in: billIds } }).lean();
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
  let buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  const endPromise = new Promise(resolve => doc.on('end', resolve));

  const drawBill = (bill) => {
    // Header
    doc.rect(50, 50, doc.page.width - 100, 60)
       .fillAndStroke('#F8F8F8', '#CCCCCC');
    
    doc.fontSize(16)
       .fillColor('#1F497D')
       .font('Helvetica-Bold')
       .text(`Bill Details: ${bill.typeOfInv}`, 70, 70);

    // Status badge
    const status = bill.status?.toUpperCase() || 'N/A';
    const statusColor = status === 'Paid' ? '#00B050' : '#FFC000';
    const statusWidth = doc.widthOfString(status) + 40;
    doc.rect(doc.page.width - statusWidth - 70, 70, statusWidth, 24)
       .fillAndStroke(statusColor, statusColor);
    doc.fontSize(12)
       .fillColor('#FFFFFF')
       .text(status, doc.page.width - statusWidth - 50, 75);

    // Main content layout
    const startY = 140;
    const col1X = 70;
    const col2X = doc.page.width / 2 + 20;
    let currentY = startY;

    // Section styling
    const section = (title, fields) => {
      doc.fontSize(14)
         .fillColor('#1F497D')
         .font('Helvetica-Bold')
         .text(title, col1X, currentY);
      currentY += 30;

      fields.forEach(([label, value]) => {
        const formattedValue = formatValue(value);
        
        // Left column
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#333333')
           .text(label + ':', col1X, currentY, { continued: true })
           .font('Helvetica')
           .text(' ' + formattedValue, { width: 200 });

        currentY += 25;
      });
      currentY += 20;
    };

    // Sections with single column layout for clarity
    section('Vendor Information', [
      ['Name', bill.vendorName],
      ['GST Number', bill.gstNumber],
      ['PO Number', bill.poNo],
      ['Department', bill.department]
    ]);

    section('Financial Details', [
      ['PO Amount', formatCurrency(bill.poAmt)],
      ['Tax Invoice Amount', formatCurrency(bill.taxInvAmt)],
      ['Advance Amount', formatCurrency(bill.advanceAmt)],
      ['Total Amount', formatCurrency(bill.amount)]
    ]);

    section('Key Dates', [
      ['Bill Date', formatDate(bill.billDate)],
      ['Payment Date', formatDate(bill.accountsDept?.paymentDate)],
      ['MIGO Date', formatDate(bill.migoDetails?.date)],
      ['Approval Date', formatDate(bill.approvalDetails?.directorApproval?.dateGiven)]
    ]);

    section('Process Status', [
      ['Quality Engineer', bill.qualityEngineer?.name],
      ['QS Inspection', bill.qsInspection?.name],
      ['Final Approval', bill.approvalDetails?.directorApproval?.status],
      ['Payment Status', bill.accountsDept?.status]
    ]);

    section('Document Details', [
      ['Attachment Type', bill.attachmentType || 'N/A'],
      ['Compliance 206AB', bill.compliance206AB]
    ]);
  };

  bills.forEach((bill, index) => {
    if (index > 0) {
      doc.addPage();
    }
    drawBill(bill);
  });

  doc.end();
  await endPromise;
  return Buffer.concat(buffers);
};

// Enhanced formatting helpers
const formatCurrency = (value) => {
  if (!value) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(value);
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatValue = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') return formatCurrency(value);
  if (value instanceof Date) return formatDate(value);
  return value.toString();
};

// CSV Export Function
export const exportBillsToCSV = async (billIds) => {
  try {
    const bills = await Bill.find({ _id: { $in: billIds } }).lean();
    
    if (!bills || bills.length === 0) {
      // Return an empty CSV with headers if no bills found
      return Buffer.from('No data found for the selected bills', 'utf-8');
    }
    
    // Flatten each bill to handle nested fields
    const flattenedBills = bills.map(bill => flattenBill(bill));
    
    // Define fields based on the first bill's structure
    const fields = Object.keys(flattenedBills[0]).map(key => ({
      label: key,
      value: key
    }));
    
    // Create parser with proper options
    const json2csvParser = new Parser({ 
      fields,
      delimiter: ',',
      quote: '"',
      header: true,
      defaultValue: '',
      excelStrings: true
    });
    
    // Convert to CSV format with error handling
    try {
      const csv = json2csvParser.parse(flattenedBills);
      return Buffer.from(csv, 'utf-8');
    } catch (parseError) {
      console.error('Error parsing bills to CSV:', parseError);
      throw new Error(`Failed to convert bills to CSV format: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Error in exportBillsToCSV:', error);
    throw error;
  }
};