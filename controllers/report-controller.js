import Bill from "../models/bill-model.js";
import VendorMaster from "../models/vendor-master-model.js";

// helper for calculating eod
const endOfDay = (dateString) => {
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999);
  return date;
};

//Outstanding Bills - completed
export const getOutstandingBillsReport = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, vendor } = req.query;

    // Build filter object based on actual bill schema
    const filter = {
      // Bills that have been received by the accounting department
      "accountsDept.dateReceived": { $ne: null, $exists: true },
      // But have not been Paid yet - field based on actual schema
      "accountsDept.paymentDate": { $eq: null },
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      filter["taxInvDate"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add vendor filter if provided
    if (vendor) {
      filter["vendorName"] = vendor;
    }



    // Fetch outstanding bills from database, and populate vendor
    const outstandingBills = await Bill.find(filter)
      .sort({ vendorName: 1, taxInvDate: 1 })
      .populate("vendor");



    // Group bills by vendor name
    const vendorGroups = {};

    outstandingBills.forEach((bill) => {
      // Use vendor name from populated vendor object
      const vendorName = bill.vendor?.vendorName || "";
      if (!vendorGroups[vendorName]) {
        vendorGroups[vendorName] = [];
      }
      vendorGroups[vendorName].push(bill);
    });

    // Sort vendor names alphabetically
    const sortedVendorNames = Object.keys(vendorGroups).sort();

    // Create the report data with grouped and sorted vendors
    let index = 1;
    let reportData = [];
    let totalInvoiceAmount = 0;
    let totalCopAmount = 0;
    let totalCount = 0;

    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    sortedVendorNames.forEach((vendorName) => {
      const vendorBills = vendorGroups[vendorName];
      let vendorSubtotal = 0;
      let vendorCopSubtotal = 0;
      const billCount = vendorBills.length;
      totalCount += billCount;

      // Sort bills within each vendor group by invoice date
      vendorBills.sort((a, b) => {
        if (a.taxInvDate && b.taxInvDate) {
          return new Date(a.taxInvDate) - new Date(b.taxInvDate);
        }
        return 0;
      });

      // Add vendor group object that will contain all vendor bills and subtotal
      const vendorGroup = {
        vendorName: vendorName,
        bills: [],
        subtotal: 0,
      };

      // Add each bill to the vendor group
      vendorBills.forEach((bill) => {
        const taxInvAmt = parseFloat(
          bill.taxInvAmt || bill.accountsDept?.paymentAmt || 0
        );
        const copAmt = parseFloat(bill.copDetails?.amount || 0);

        vendorSubtotal += !isNaN(taxInvAmt) ? taxInvAmt : 0;
        vendorCopSubtotal += !isNaN(copAmt) ? copAmt : 0;

        totalInvoiceAmount += !isNaN(taxInvAmt) ? taxInvAmt : 0;
        totalCopAmount += !isNaN(copAmt) ? copAmt : 0;
        vendorGroup.bills.push({
          srNo: bill.srNo,
          projectDescription: bill.projectDescription || "",
          region: bill.region || "",
          vendorNo: bill.vendor?.vendorNo || "",
          vendorName: bill.vendor?.vendorName || "",
          taxInvNo: bill.taxInvNo || "",
          taxInvDate: formatDate(bill.taxInvDate) || "",
          taxInvAmt: !isNaN(taxInvAmt) ? Number(taxInvAmt.toFixed(2)) : 0,
          copAmt: !isNaN(parseFloat(bill.copDetails?.amount))
            ? Number(parseFloat(bill.copDetails.amount).toFixed(2))
            : 0,
          dateRecdInAcctsDept:
            formatDate(bill.accountsDept?.dateReceived) || "",
          paymentInstructions: bill.accountsDept?.paymentInstructions || "",
          remarksForPaymentInstructions:
            bill.accountsDept?.remarksForPayInstructions || "",
        });
      });

      // Add the subtotal
      vendorGroup.subtotal = Number(vendorSubtotal.toFixed(2));
      vendorGroup.subtotalCopAmt = Number(vendorCopSubtotal.toFixed(2));

      // Add all bills from this vendor to the report data
      vendorGroup.bills.forEach((bill) => reportData.push(bill));

      // Add subtotal row after each vendor's bills
      reportData.push({
        isSubtotal: true,
        vendorName: vendorName,
        subtotalLabel: `Subtotal for ${vendorName}:`,
        subtotalAmount: Number(vendorSubtotal.toFixed(2)),
        subtotalCopAmt: Number(vendorCopSubtotal.toFixed(2)),
        count: billCount,
      });
    });

    // Add grand total row
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total:",
      grandTotalAmount: Number(totalInvoiceAmount.toFixed(2)),
      grandTotalCopAmt: Number(totalCopAmount.toFixed(2)),
      totalCount: totalCount,
    });

    // Calculate vendor subtotals for summary section
    const vendorSubtotals = sortedVendorNames.map((vendorName) => {
      const vendorBills = vendorGroups[vendorName];
      const totalAmount = vendorBills.reduce((sum, bill) => {
        const amount = parseFloat(
          bill.taxInvAmt || bill.accountsDept?.paymentAmt || 0
        );
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      const totalCopAmount = vendorBills.reduce((sum, bill) => {
        // Calculate total COP amount
        const copAmount = parseFloat(bill.copDetails?.amount || 0);
        return sum + (isNaN(copAmount) ? 0 : copAmount);
      }, 0);
      return {
        vendorName,
        totalAmount: Number(totalAmount.toFixed(2)),
        totalCopAmount: Number(totalCopAmount.toFixed(2)),
        count: vendorBills.length,
      };
    });

    // Prepare the final response
    const response = {
      report: {
        title: "Outstanding Bills Report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic:
            "date inv recd in accts dept is filled and date of payment is empty",
          sorting: ["vendorName", "invoiceDate"],
        },
        data: reportData,
        summary: {
          vendorSubtotals,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          totalCopAmount: Number(totalCopAmount.toFixed(2)),
          recordCount: reportData.length - sortedVendorNames.length - 1, // Subtract subtotal and grand total rows
        },
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating outstanding bills report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

//Invoices received at side - completed with total
export const getInvoicesReceivedAtSite = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, vendor } = req.query;

    // Build filter object based on actual bill schema
    const filter = {
      // Tax invoice received at site date should be filled
      taxInvRecdAtSite: { $ne: null, $exists: true },
      "pimoMumbai.dateReceived": { $eq: null },
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      filter["taxInvRecdAtSite"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }


    // Fetch invoices received at site from database and populate vendor
    const invoicesReceivedAtSite = await Bill.find(filter)
      .sort({ taxInvRecdAtSite: -1 })
      .populate("vendor")
      .populate("natureOfWork");


    let reportData = [];

    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesReceivedAtSite.map((invoice) => ({
      srNo: invoice.srNo,
      region: invoice.region,
      projectDescription: invoice.projectDescription,
      vendorNo: invoice.vendor?.vendorNo || "",
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      taxInvRecdAtSite: formatDate(invoice.taxInvRecdAtSite) || "",
      poNo: invoice.poNo,
    }));

    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      count,
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
    });

    // Prepare the final response
    const response = {
      report: {
        title: "Invoices Received at Site Report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic:
            "date of tax invoice received at site is filled and sent to Mumbai is blank",
          sorting: ["dateReceivedAtSite"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating invoices received at site report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};
//Invoices received at PIMO Mumbai - completed with total
export const getInvoicesReceivedAtPIMOMumbai = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, vendor } = req.query;

    // Build filter object based on actual bill schema
    const filter = {
      taxInvRecdAtSite: { $ne: null, $exists: true },
      "pimoMumbai.dateReceived": { $ne: null, $exists: true },
      "accountsDept.dateGiven": { $eq: null },
    };

    if (startDate && endDate) {
      filter["pimoMumbai.dateReceived"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }
    if (region) {
      filter["region"] = region;
    }


    const invoicesReceivedAtMumbai = await Bill.find(filter)
      .sort({ "pimoMumbai.dateReceived": -1 })
      .populate("vendor")
      .populate("natureOfWork");

 
    let reportData = [];

    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesReceivedAtMumbai.map((invoice) => ({
      srNo: invoice.srNo,
      region: invoice.region,
      projectDescription: invoice.projectDescription,
      vendorNo: invoice.vendor?.vendorNo || "",
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      pimoDateReceived: formatDate(invoice.pimoMumbai.dateReceived) || "",
      poNo: invoice.poNo,
    }));
    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      count,
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
    });
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices Received at Mumbai Report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic:
            "date of tax invoice received at Mumbai is filled and sent to accounts department is blank",
          sorting: ["vendorName", "dateReceivedAtMumbai"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error(
      "Error generating invoices received at Mumbai report:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};
//Invoices sent to PIMO - completed with total
export const getInvoicesCourierToPIMOMumbai = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, nameSiteOffice, vendor } = req.query;

    const filter = {
      taxInvRecdAtSite: { $ne: null, $exists: true },
      "pimoMumbai.dateGiven": { $ne: null, $exists: true },
    };

    if (startDate && endDate) {
      filter["pimoMumbai.dateGiven"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }


    // Fetch invoices couriered to Mumbai from database and populate vendor
    const invoicesCourierToMumbai = await Bill.find(filter)
      .sort({ "pimoMumbai.dateGiven": -1 })
      .populate("vendor")
      .populate("natureOfWork");


    let reportData = [];

    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesCourierToMumbai.map((invoice) => ({
      srNo: invoice.srNo,
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      dateDispatchedForPimo: formatDate(invoice.pimoMumbai.dateGiven) || "",
    }));
    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
      count,
    });
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices Couriered to Mumbai Report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic:
            "date of tax invoice received at site is filled and sent to Mumbai is filled",
          sorting: ["vendorName", "courierDate"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating invoices courier to Mumbai report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};
//Invoices sent to Accounts team - completed with total
export const getInvoicesGivenToAcctsDept = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, vendor } = req.query;

    // Build filter object based on actual bill schema
    const filter = {
      taxInvRecdAtSite: { $ne: null, $exists: true },
      "pimoMumbai.dateReceived": { $ne: null, $exists: true },
      "accountsDept.dateGiven": { $ne: null, $exists: true },
    };
    if (startDate && endDate) {
      filter["accountsDept.dateGiven"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }
    if (region) {
      filter["region"] = region;
    }



    // Fetch invoices given to accounts department from database and populate vendor
    const invoicesGivenToAcctsDept = await Bill.find(filter)
      .sort({ "accountsDept.dateGiven": -1 })
      .populate("vendor")
      .populate("natureOfWork");



    let reportData = [];
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesGivenToAcctsDept.map((invoice) => ({
      srNo: invoice.srNo,
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice?.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      dateGivenToAccounts: formatDate(invoice.accountsDept?.dateGiven) || "",
    }));
    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
      count,
    });
    const response = {
      report: {
        title: "Invoices Given to Accounts Department Report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic:
            "date of tax invoice received at Mumbai is filled and sent to accounts department is filled",
          sorting: ["vendorName", "dateGivenToAccounts"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error(
      "Error generating invoices given to accounts department report:",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};
//Invoices paid - completed with total
export const getInvoicesPaid = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, f110Identification } = req.query;

    // Build filter object based on actual bill schema
    const filter = {
      "accountsDept.dateReceived": { $ne: null, $exists: true },
      "accountsDept.paymentDate": { $ne: null, $exists: true },
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      filter["accountsDept.paymentDate"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    if (f110Identification) {
      filter["f110Identification"] = f110Identification;
    }


    // Fetch bills from database, sort by vendor name first, then by sr no
    const invoices = await Bill.find(filter)
      .sort({ "accountsDept.paymentDate": 1 })
      .populate("vendor");

    let reportData = [];

    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoices.map((invoice) => ({
      srNo: invoice.srNo,
      dateReceivedAtAccts: formatDate(invoice.accountsDept?.dateReceived) || "",
      dateOfPayment: formatDate(invoice.accountsDept?.paymentDate) || "",
      vendorNo: invoice.vendor?.vendorNo || "",
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice?.taxInvNo || "",
      taxInvDate: formatDate(invoice?.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      copAmount: invoice.copDetails?.amount || "",
      payentAmt: invoice.amount || "",
    }));
    // Prepare the final response
    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    const totalCopAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.copAmount) || 0),
      0
    );
    const totalPaymentAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.paymentAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
      grandTotalCopAmt: totalCopAmt,
      grandTotalAmount: totalPaymentAmt,
      count,
    });
    const response = {
      report: {
        title: "Invoices Paid",
        generatedAt: new Date().toISOString(),
        selectionCriteria: {
          dateRange:
            startDate && endDate
              ? `from ${startDate} to ${endDate}`
              : "All dates",
          f110Identification: f110Identification || "All F110 identifications",
        },
        sortingCriteria: ["Date of Payment"],
        filterLogic: "Dt of payment should be filled (Column 89)",
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating invoices Paid report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};
//Invoices sent to QS - completed
export const getInvoicesGivenToQsSite = async (req, res) => {
  try {
    const { startDate, endDate, region, vendor } = req.query;
    // Build filter object based on actual bill schema
    const filter = {
      "qsMeasurementCheck.dateGiven": { $ne: null, $exists: true },
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      filter["qsMeasurementCheck.dateGiven"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }

    const invoicesGivenToQsSite = await Bill.find(filter)
      .sort({ "qsMeasurementCheck.dateGiven": 1 })
      .populate("vendor")
      .populate("natureOfWork");

  

    let reportData = [];

    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesGivenToQsSite.map((invoice) => ({
      srNo: invoice.srNo,
      region: invoice.region,
      projectDescription: invoice.projectDescription,
      vendorNo: invoice.vendor?.vendorNo || "",
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      dateGivenToQSMeasurement:
        formatDate(invoice.qsMeasurementCheck?.dateGiven) || "",
      poNo: invoice.poNo,
    }));
    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      count,
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
    });

    const response = {
      report: {
        title: "Invoices Given to QS Site Report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic: "date of invoice given to QS site is filled",
          sorting: ["dateGivenToQsSite"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating invoices given to QS site report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

//invoices with QS for prov COP - completed ( to create route)
export const getInvoicesAtQSforProvCOP = async (req, res) => {
  try {
    const { startDate, endDate, region } = req.query;
    const filter = {
      "qsCOP.dateGiven": { $ne: null, $exists: true },
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      filter["qsCOP.dateGiven"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }

    const invoicesGivenToQsCOP = await Bill.find(filter)
      .sort({ "qsCOP.dateGiven": -1 })
      .populate("vendor")
      .populate("natureOfWork");



    let reportData = [];

    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesGivenToQsCOP.map((invoice) => ({
      srNo: invoice.srNo,
      region: invoice.region,
      projectDescription: invoice.projectDescription,
      vendorNo: invoice.vendor?.vendorNo || "",
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      dateGiventoQsCOP: formatDate(invoice.qsCOP?.dateGiven) || "",
      poNo: invoice.poNo,
    }));
    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      count,
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
    });
    const response = {
      report: {
        title: "Invoices Given to QS for Prov. COP report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic: "date of invoice given to QS site is filled",
          sorting: ["dateGivenToQsCOP"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating invoices given to QS site report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

//invoices with QS Mumbai for COP -completed (to create route)
export const getInvoicesAtQSMumbai = async (req, res) => {
  try {
    const { startDate, endDate, region } = req.query;
    const filter = {
      "qsMumbai.dateGiven": { $ne: null, $exists: true },
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      filter["qsMumbai.dateGiven"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }

    const invoicesAtQsMumbai = await Bill.find(filter)
      .sort({ "qsCOP.dateGiven": -1 })
      .populate("vendor")
      .populate("natureOfWork");


    let reportData = [];

    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesAtQsMumbai.map((invoice) => ({
      srNo: invoice.srNo,
      region: invoice.region,
      projectDescription: invoice.projectDescription,
      vendorNo: invoice.vendor?.vendorNo || "",
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      dateGivenToQsMumbai: formatDate(invoice.qsMumbai?.dateGiven) || "",
      poNo: invoice.poNo,
    }));
    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      count,
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
    });
    const response = {
      report: {
        title: "Invoices Given to QS for Prov. COP report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic: "date of invoice given to QS site is filled",
          sorting: ["dateGivenToQsCOP"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating invoices given to QS site report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

//invoices returned from QS measuremnt - completed ( to create route )
export const getInvoicesReturnedByQsSite = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, nameSiteOffice, vendor } = req.query;

    const filter = {
      taxInvRecdAtSite: { $ne: null, $exists: true },
      "vendorFinalInv.dateGiven": { $ne: null, $exists: true },
    };

    if (startDate && endDate) {
      filter["vendorFinalInv.dateGiven"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }


    // Fetch invoices couriered to Mumbai from database and populate vendor
    const invoicesReturnedFromQsMeasurement = await Bill.find(filter)
      .sort({ "vendorFinalInv.dateGiven.dateGiven": -1 })
      .populate("vendor")
      .populate("natureOfWork");

 

    let reportData = [];

    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesReturnedFromQsMeasurement.map((invoice) => ({
      srNo: invoice.srNo,
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      dateReturnedFromQsMeasurement:
        formatDate(invoice.siteOfficeDispatch.dateGiven) || "",
    }));

    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
      count,
    });
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices Couriered to Mumbai Report",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic: "date of return of Invoice from qs measurement",
          sorting: ["returnDate"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating invoices courier to Mumbai report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

//invoices returned from QS after COP - completed ( to create route )
export const getInvoicesReturnedByQsCOP = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, nameSiteOffice, vendor } = req.query;

    const filter = {
      taxInvRecdAtSite: { $ne: null, $exists: true },
      "copDeatils.dateReturned": { $ne: null, $exists: true },
    };

    if (startDate && endDate) {
      filter["copDeatils.dateReturned"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }



    // Fetch invoices couriered to Mumbai from database and populate vendor
    const invoicesReturnedFromQsCOP = await Bill.find(filter)
      .sort({ "copDetails.dateReturned": -1 })
      .populate("vendor")
      .populate("natureOfWork");


    let reportData = [];

    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesReturnedFromQsCOP.map((invoice) => ({
      srNo: invoice.srNo,
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      dateDispatchedForPimo: formatDate(invoice.copDetails?.dateReturned) || "",
    }));
    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
      count,
    });
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices returned after Prov COP from",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic: "date of return of Invoice from qs cop",
          sorting: ["returnDate"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating invoices courier to Mumbai report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

//invoices returned fromm QS Mumbai
export const getInvoicesReturnedByQSMumbai = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, nameSiteOffice, vendor } = req.query;

    const filter = {
      taxInvRecdAtSite: { $ne: null, $exists: true },
      "pimoMumbai.dateReturnedFromQs": { $ne: null, $exists: true },
    };

    if (startDate && endDate) {
      filter["pimoMumbai.dateReturnedFromQs"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }



    // Fetch invoices couriered to Mumbai from database and populate vendor
    const invoicesReturnedFromQsMumbai = await Bill.find(filter)
      .sort({ "pimoMumbai.dateReturnedFromQs": -1 })
      .populate("vendor")
      .populate("natureOfWork");


    let reportData = [];

    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    reportData = invoicesReturnedFromQsMumbai.map((invoice) => ({
      srNo: invoice.srNo,
      vendorName: invoice.vendor?.vendorName || "",
      taxInvNo: invoice.taxInvNo,
      taxInvDate: formatDate(invoice.taxInvDate) || "",
      taxInvAmt: invoice.taxInvAmt,
      dateReturnedByQS:
        formatDate(invoice.pimoMumbai?.dateReturnedFromQs) || "",
    }));

    const totalTaxInvAmt = reportData.reduce(
      (sum, item) => sum + (Number(item.taxInvAmt) || 0),
      0
    );
    let count = reportData.length;
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
      count,
    });
    // Prepare the final response
    const response = {
      report: {
        title: "Invoices returned after Prov COP from",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic: "date of return of Invoice from qs cop",
          sorting: ["returnDate"],
        },
        data: reportData,
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating invoices courier to Mumbai report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

export const getPendingBillsReport = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region } = req.query;

    // Build filter object based on actual bill schema
    // This report gets bills that are still pending with various offices
    const filter = {
      // Invoice received at site but not yet completed/Paid
      taxInvRecdAtSite: { $ne: null, $exists: true },
      // Not marked as completed (payment not made)
      "accountsDept.paymentDate": { $eq: null },
    };

    // Add date range filter if provided
    if (startDate && endDate) {
      filter["taxInvRecdAtSite"] = {
        $gte: new Date(startDate),
        $lte: endOfDay(endDate),
      };
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }



    // Fetch bills from database, sort by vendor name first, then by sr no
    const pendingBills = await Bill.find(filter)
      .sort({ vendorName: 1, srNo: 1 })
      .populate("vendor");



    // Group bills by vendor name
    const vendorGroups = {};

    pendingBills.forEach((bill) => {
      // Use vendor name from populated vendor object
      const vendorName = bill.vendor?.vendorName || "";
      if (!vendorGroups[vendorName]) {
        vendorGroups[vendorName] = [];
      }
      vendorGroups[vendorName].push(bill);
    });

    // Sort vendor names alphabetically
    const sortedVendorNames = Object.keys(vendorGroups).sort();

    // Create the report data with grouped and sorted vendors
    let reportData = [];
    let totalInvoiceAmount = 0;
    let totalCount = 0;

    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    sortedVendorNames.forEach((vendorName) => {
      const vendorBills = vendorGroups[vendorName];
      let vendorSubtotal = 0;
      const billCount = vendorBills.length;
      totalCount += billCount;

      // Sort bills within each vendor group by sr no
      vendorBills.sort((a, b) => {
        const aSrNo = parseInt(a.srNo) || 0;
        const bSrNo = parseInt(b.srNo) || 0;
        return aSrNo - bSrNo;
      });

      // Add each bill from this vendor to the report data
      vendorBills.forEach((bill) => {
        const invoiceAmount = parseFloat(bill.taxInvAmt || 0);
        vendorSubtotal += !isNaN(invoiceAmount) ? invoiceAmount : 0;
        totalInvoiceAmount += !isNaN(invoiceAmount) ? invoiceAmount : 0;

        reportData.push({
          srNo: bill.srNo || "",
          projectDescription: bill.projectDescription || "",
          vendorName: bill.vendor?.vendorName || "",
          invoiceNo: bill.taxInvNo || "",
          invoiceDate: formatDate(bill.taxInvDate) || "",
          invoiceAmount: !isNaN(invoiceAmount)
            ? Number(invoiceAmount.toFixed(2))
            : 0,
          dateInvoiceReceivedAtSite: formatDate(bill.taxInvRecdAtSite) || "",
          dateBillReceivedAtPimoRrrm:
            formatDate(bill.pimoMumbai?.dateReceived) || "",
          poNo: bill.poNo || "",
        });
      });

      // Add subtotal row after each vendor's bills
      reportData.push({
        isSubtotal: true,
        vendorName: vendorName,
        subtotalLabel: `Subtotal for ${vendorName}:`,
        subtotalAmount: Number(vendorSubtotal.toFixed(2)),
        count: billCount,
      });
    });

    // Add grand total row
    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total:",
      grandTotalAmount: Number(totalInvoiceAmount.toFixed(2)),
      totalCount: totalCount,
    });

    // Calculate vendor subtotals for summary section
    const vendorSubtotals = sortedVendorNames.map((vendorName) => {
      const vendorBills = vendorGroups[vendorName];
      const totalAmount = vendorBills.reduce((sum, bill) => {
        const amount = parseFloat(bill.taxInvAmt || 0);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      return {
        vendorName,
        totalAmount: Number(totalAmount.toFixed(2)),
        count: vendorBills.length,
      };
    });

    // Prepare the final response
    const response = {
      report: {
        title:
          "Reports of pending bills with PIMO/SVKM site office/QS Mumbai office/QS site office",
        generatedAt: new Date().toISOString(),
        filterCriteria: {
          logic: "invoice received at site but not yet completed/paid",
          sorting: ["vendorName", "srNo"],
        },
        data: reportData,
        summary: {
          vendorSubtotals,
          totalCount: totalCount,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
        },
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating pending bills report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};

export const getBillJourney = async (req, res) => {
  try {
    // Parse query parameters for filtering
    const { startDate, endDate, region, vendorName } = req.query;

    // Build filter object - start with an empty filter to see if any bills exist
    const filter = {};


    const totalCount = await Bill.countDocuments({});


    // Check if dates are provided and valid before adding to filter
    if (startDate && endDate) {
      try {
        // Parse dates and ensure they're valid
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (!isNaN(parsedStartDate) && !isNaN(parsedEndDate)) {
          // Valid dates, add to filter
          filter["taxInvDate"] = {
            $gte: parsedStartDate,
            $lte: endOfDay(endDate),
          };
        } 
      } catch (dateError) {
        console.error("Date parsing error:", dateError);
        // Continue without date filter if there's an error
      }
    }

    // Add region filter if provided
    if (region) {
      filter["region"] = region;
    }

    // Add vendor filter if provided
    if (vendorName) {
      filter["vendorName"] = vendorName;
    }



    // Debug database schema - get first bill to check field names
    const sampleBill = await Bill.findOne({});
    

    // Fetch bills from database, sort by sr no
    const bills = await Bill.find(filter).sort({ srNo: 1 }).populate("vendor");


    // If no bills found, try a more relaxed query
    if (bills.length === 0 && (startDate || endDate || region || vendorName)) {
      // Try just the date filter without other constraints
      const relaxedFilter = {};
      if (startDate && endDate) {
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);
        if (!isNaN(parsedStartDate) && !isNaN(parsedEndDate)) {
          relaxedFilter["taxInvDate"] = {
            $gte: parsedStartDate,
            $lte: parsedEndDate,
          };
        }
      }
      const relaxedBills = await Bill.find(relaxedFilter)
        .limit(10)
        .populate("vendor");


      if (relaxedBills.length > 0) {
        // If we found bills with the relaxed query, check if they have the expected fields
        const sampleBill = relaxedBills[0];
      }
    }

    // Continue with report generation even if no bills found
    // Format date strings properly
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return isNaN(date.getTime())
        ? null
        : `${String(date.getDate()).padStart(2, "0")}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${date.getFullYear()}`;
    };

    // Calculate date differences in days
    const daysBetween = (date1, date2) => {
      if (!date1 || !date2) return null;

      const d1 = new Date(date1);
      const d2 = new Date(date2);

      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;

      // Calculate difference in milliseconds and convert to days
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays;
    };

    // Process data for response
    let totalInvoiceAmount = 0;
    let totalSiteDays = 0;
    let totalMumbaiDays = 0;
    let totalAccountsDays = 0;
    let totalPaymentDays = 0;

    let countSiteDays = 0;
    let countMumbaiDays = 0;
    let countAccountsDays = 0;
    let countPaymentDays = 0;

    const reportData = bills.map((bill) => {
      const invoiceAmount = parseFloat(bill.taxInvAmt || 0);
      totalInvoiceAmount += !isNaN(invoiceAmount) ? invoiceAmount : 0;

      // Calculate delays and processing days
      const delay_for_receiving_invoice = daysBetween(
        bill.taxInvDate,
        bill.taxInvRecdAtSite
      );

      // Days at site: from receipt at site to dispatch to Mumbai
      const no_of_Days_Site = daysBetween(
        bill.taxInvRecdAtSite,
        bill.siteOfficeDispatch?.dateGiven
      );
      if (no_of_Days_Site !== null) {
        totalSiteDays += no_of_Days_Site;
        countSiteDays++;
      }

      // Days at Mumbai: from receipt at Mumbai to given to accounts
      const no_of_Days_at_Mumbai = daysBetween(
        bill.pimoMumbai?.dateReceived,
        bill.accountsDept?.dateGiven
      );
      if (no_of_Days_at_Mumbai !== null) {
        totalMumbaiDays += no_of_Days_at_Mumbai;
        countMumbaiDays++;
      }

      // Days at accounts: from receipt at accounts to payment
      const no_of_Days_at_AC = daysBetween(
        bill.accountsDept?.dateReceived,
        bill.accountsDept?.paymentDate
      );
      if (no_of_Days_at_AC !== null) {
        totalAccountsDays += no_of_Days_at_AC;
        countAccountsDays++;
      }

      // Total days for payment: from invoice date to payment date
      const days_for_payment = daysBetween(
        bill.taxInvDate,
        bill.accountsDept?.paymentDate
      );
      if (days_for_payment !== null) {
        totalPaymentDays += days_for_payment;
        countPaymentDays++;
      }

      return {
        srNo: bill.srNo || "",
        region: bill.region || "",
        projectDescription: bill.projectDescription || "",
        vendorName: bill.vendor?.vendorName || "",
        invoiceDate: formatDate(bill.taxInvDate) || "",
        invoiceAmount: !isNaN(invoiceAmount)
          ? Number(invoiceAmount.toFixed(2))
          : 0,
        delay_for_receiving_invoice,
        no_of_Days_Site,
        no_of_Days_at_Mumbai,
        no_of_Days_at_AC,
        days_for_payment,
      };
    });

    // Calculate averages
    const avgSiteDays =
      countSiteDays > 0
        ? Number((totalSiteDays / countSiteDays).toFixed(1))
        : 0;
    const avgMumbaiDays =
      countMumbaiDays > 0
        ? Number((totalMumbaiDays / countMumbaiDays).toFixed(2))
        : 0;
    const avgAccountsDays =
      countAccountsDays > 0
        ? Number((totalAccountsDays / countAccountsDays).toFixed(1))
        : 0;
    const avgPaymentDays =
      countPaymentDays > 0
        ? Number((totalPaymentDays / countPaymentDays).toFixed(1))
        : 0;

    // Prepare the final response
    const response = {
      report: {
        title: "Bill Journey",
        generatedAt: new Date().toISOString(),
        //Fix Filter Data
        filterCriteria: {
          dateRange:
            startDate && endDate
              ? {
                  from: formatDate(new Date(startDate)),
                  to: formatDate(new Date(endDate)),
                }
              : "All dates",
        },
        data: reportData,
        summary: {
          totalCount: reportData.length,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          averageProcessingDays: {
            siteProcessing: avgSiteDays,
            mumbaiProcessing: avgMumbaiDays,
            accountingProcessing: avgAccountsDays,
            totalPaymentDays: avgPaymentDays,
          },
        },
      },
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error generating bill journey report:", error);
    return res.status(500).json({
      success: false,
      message: "Error generating report",
      error: error.message,
    });
  }
};
