import Bill from "../models/bill-model.js";
import {
  FIELDS,
  formatDate,
  formatAmount,
  blankOr,
  dateFilled,
  dateBlank,
  resolveDateRange,
  applyDateRangeToFilter,
  applyRegionFilter,
  applySiteStatusFilter,
  applyPaymentStatusFilter,
  applySrNoFilter,
  applyVendorFilter,
  standardInvoiceRow,
  compactInvoiceRow,
  sortUnpaidFirstThenAmountDesc,
  daysBetween,
  appendGrandTotal,
  buildSelectionCriteria,
  buildReportEnvelope,
  billJourneyChecklistRow,
  billKidharRow,
  fiscalYearStartISO,
  todayISO,
} from "../utils/report-utils.js";

const handleReportError = (res, error, label) => {
  console.error(`Error generating ${label}:`, error);
  return res.status(500).json({
    success: false,
    message: "Error generating report",
    error: error.message,
  });
};

const fetchBills = (filter, sort, populate = true) => {
  let query = Bill.find(filter).sort(sort);
  if (populate) {
    query = query.populate("vendor");
  }
  return query;
};

// 12. Outstanding Bills Report
export const getOutstandingBillsReport = async (req, res) => {
  try {
    const { region, vendor, vendorName } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.acctsReceived),
      ...dateBlank(FIELDS.paymentDate),
      siteStatus: "accept",
    };

    applyDateRangeToFilter(filter, FIELDS.taxInvDate, dateRange.start, dateRange.end);
    applyRegionFilter(filter, region);
    await applyVendorFilter(filter, vendor || vendorName);

    const bills = await fetchBills(filter, { [FIELDS.taxInvDate]: 1 });

    const vendorGroups = {};
    bills.forEach((bill) => {
      const name = bill.vendor?.vendorName || "";
      if (!vendorGroups[name]) vendorGroups[name] = [];
      vendorGroups[name].push(bill);
    });

    const sortedVendorNames = Object.keys(vendorGroups).sort();
    let reportData = [];
    let totalInvoiceAmount = 0;
    let totalCopAmount = 0;
    let totalCount = 0;

    sortedVendorNames.forEach((name) => {
      const vendorBills = vendorGroups[name];
      vendorBills.sort(
        (a, b) => new Date(a.taxInvDate || 0) - new Date(b.taxInvDate || 0)
      );

      let vendorSubtotal = 0;
      let vendorCopSubtotal = 0;

      vendorBills.forEach((bill) => {
        const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
        const copAmt = parseFloat(bill.copDetails?.amount || 0);
        vendorSubtotal += isNaN(taxInvAmt) ? 0 : taxInvAmt;
        vendorCopSubtotal += isNaN(copAmt) ? 0 : copAmt;
        totalInvoiceAmount += isNaN(taxInvAmt) ? 0 : taxInvAmt;
        totalCopAmount += isNaN(copAmt) ? 0 : copAmt;
        totalCount++;

        reportData.push({
          srNo: blankOr(bill.srNo),
          region: blankOr(bill.region),
          vendorNo: blankOr(bill.vendor?.vendorNo),
          vendorName: blankOr(bill.vendor?.vendorName),
          taxInvNo: blankOr(bill.taxInvNo),
          taxInvDate: formatDate(bill.taxInvDate),
          taxInvAmt: formatAmount(bill.taxInvAmt),
          dateRecdInAcctsDept: formatDate(bill.accountsDept?.dateReceived),
          copAmt: formatAmount(bill.copDetails?.amount),
          paymentInstructions: blankOr(bill.accountsDept?.paymentInstructions),
          remarksForPaymentInstructions: blankOr(
            bill.accountsDept?.remarksForPayInstructions
          ),
        });
      });

      reportData.push({
        isSubtotal: true,
        vendorName: name,
        subtotalLabel: `Subtotal for ${name}:`,
        subtotalAmount: Number(vendorSubtotal.toFixed(2)),
        subtotalCopAmt: Number(vendorCopSubtotal.toFixed(2)),
        count: vendorBills.length,
      });
    });

    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalAmount: Number(totalInvoiceAmount.toFixed(2)),
      grandTotalCopAmt: Number(totalCopAmount.toFixed(2)),
      count: totalCount,
    });

    return res.status(200).json(
      buildReportEnvelope({
        title: "Outstanding Bills Report",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          vendorName: vendor || vendorName,
          logic:
            "Dt recd in Accts dept filled, Dt of payment blank, Status Accept",
          sorting: ["Vendor Name", "Tax Inv Date (Oldest to Newest)"],
        }),
        data: reportData,
        summary: {
          totalCount,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          totalCopAmount: Number(totalCopAmount.toFixed(2)),
        },
      })
    );
  } catch (error) {
    return handleReportError(res, error, "outstanding bills report");
  }
};

// 13. Outstanding Bills Report Subtotal
export const getOutstandingBillsSubtotalReport = async (req, res) => {
  try {
    const { region, vendor, vendorName } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.acctsReceived),
      ...dateBlank(FIELDS.paymentDate),
      siteStatus: "accept",
    };

    applyDateRangeToFilter(filter, FIELDS.taxInvDate, dateRange.start, dateRange.end);
    applyRegionFilter(filter, region);
    await applyVendorFilter(filter, vendor || vendorName);

    const bills = await fetchBills(filter, { [FIELDS.taxInvDate]: 1 });

    const vendorGroups = {};
    bills.forEach((bill) => {
      const name = bill.vendor?.vendorName || "";
      if (!vendorGroups[name]) vendorGroups[name] = [];
      vendorGroups[name].push(bill);
    });

    const sortedVendorNames = Object.keys(vendorGroups).sort();
    let reportData = [];
    let totalInvoiceAmount = 0;
    let totalCopAmount = 0;
    let totalCount = 0;

    sortedVendorNames.forEach((name) => {
      const vendorBills = vendorGroups[name];
      vendorBills.sort(
        (a, b) => new Date(a.taxInvDate || 0) - new Date(b.taxInvDate || 0)
      );

      let vendorSubtotal = 0;
      let vendorCopSubtotal = 0;

      vendorBills.forEach((bill) => {
        const taxInvAmt = parseFloat(bill.taxInvAmt || 0);
        const copAmt = parseFloat(bill.copDetails?.amount || 0);
        vendorSubtotal += isNaN(taxInvAmt) ? 0 : taxInvAmt;
        vendorCopSubtotal += isNaN(copAmt) ? 0 : copAmt;
        totalInvoiceAmount += isNaN(taxInvAmt) ? 0 : taxInvAmt;
        totalCopAmount += isNaN(copAmt) ? 0 : copAmt;
        totalCount++;

        reportData.push({
          srNo: blankOr(bill.srNo),
          region: blankOr(bill.region),
          vendorNo: blankOr(bill.vendor?.vendorNo),
          vendorName: blankOr(bill.vendor?.vendorName),
          taxInvNo: blankOr(bill.taxInvNo),
          taxInvDate: formatDate(bill.taxInvDate),
          taxInvAmt: formatAmount(bill.taxInvAmt),
          copAmt: formatAmount(bill.copDetails?.amount),
          dateRecdInAcctsDept: formatDate(bill.accountsDept?.dateReceived),
        });
      });

      reportData.push({
        isSubtotal: true,
        vendorName: name,
        subtotalLabel: `Subtotal for ${name}:`,
        subtotalAmount: Number(vendorSubtotal.toFixed(2)),
        subtotalCopAmt: Number(vendorCopSubtotal.toFixed(2)),
        count: vendorBills.length,
      });
    });

    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalAmount: Number(totalInvoiceAmount.toFixed(2)),
      grandTotalCopAmt: Number(totalCopAmount.toFixed(2)),
      count: totalCount,
    });

    return res.status(200).json(
      buildReportEnvelope({
        title: "Outstanding Bills Report Subtotal",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          vendorName: vendor || vendorName,
          logic:
            "Dt recd in Accts dept filled, Dt of payment blank, Status Accept",
          sorting: ["Vendor Name", "Tax Inv Date (Oldest to Newest)"],
        }),
        data: reportData,
        summary: {
          totalCount,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          totalCopAmount: Number(totalCopAmount.toFixed(2)),
        },
      })
    );
  } catch (error) {
    return handleReportError(res, error, "outstanding bills subtotal report");
  }
};

// 1. Invoices at Site
export const getInvoicesReceivedAtSite = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.taxInvRecdAtSite),
      ...dateBlank(FIELDS.pimoDispatch),
      siteStatus: "hold",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.taxInvRecdAtSite,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.taxInvRecdAtSite]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill) => standardInvoiceRow(bill))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices at Site",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt recd at Site filled, Dt dispatched-PIMO blank, Status Hold",
          sorting: ["Dt of tax Invoice recd at site (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices at site report");
  }
};

// 2. Invoices at PIMO
export const getInvoicesReceivedAtPIMOMumbai = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.pimoReceived),
      ...dateBlank(FIELDS.acctsGiven),
      siteStatus: "accept",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.pimoReceived,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.pimoReceived]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill) => standardInvoiceRow(bill))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices at PIMO",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt recd-PIMO from Site filled, Dt given-Accts blank, Status Accept",
          sorting: ["Dt recd-PIMO from Site (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices at PIMO report");
  }
};

// 3. Invoices with QS Site for Measurement
export const getInvoicesGivenToQsSite = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.qsMeasureGiven),
      ...dateBlank(FIELDS.qsMeasureReturn),
      siteStatus: "hold",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.qsMeasureGiven,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.qsMeasureGiven]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill) => standardInvoiceRow(bill))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices with QS Site for Measurement",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt given-QS for measure filled, Dt ret-QS aft measure blank, Status Hold",
          sorting: ["Dt given-QS for measure (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices with QS site for measurement");
  }
};

// 4. Invoices with QS Site for Prov COP
export const getInvoicesAtQSforProvCOP = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.qsCopGiven),
      ...dateBlank(FIELDS.qsCopReturn),
      siteStatus: "hold",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.qsCopGiven,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.qsCopGiven]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill) => standardInvoiceRow(bill))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices with QS Site for Prov COP",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt given-QS for Prov COP filled, Dt ret-QS aft Prov COP blank, Status Hold",
          sorting: ["Dt given-QS for Prov COP (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices with QS site for Prov COP");
  }
};

// 5. Invoices with QS Mumbai for COP
export const getInvoicesAtQSMumbai = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.qsMumbaiGiven),
      ...dateBlank(FIELDS.qsMumbaiReturn),
      siteStatus: "hold",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.qsMumbaiGiven,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.qsMumbaiGiven]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill) => standardInvoiceRow(bill))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices with QS Mumbai for COP",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt given-QS Mumbai for COP filled, Dt ret-PIMO by QS Mumbai blank, Status Hold",
          sorting: ["Dt given-QS Mumbai for COP (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices with QS Mumbai for COP");
  }
};

// 6. Invoices Sent to PIMO Mumbai
export const getInvoicesCourierToPIMOMumbai = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.taxInvRecdAtSite),
      ...dateFilled(FIELDS.pimoDispatch),
      ...dateBlank(FIELDS.pimoReceived),
      siteStatus: "hold",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.pimoDispatch,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.pimoDispatch]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill, i) => ({
        ...compactInvoiceRow(bill, i),
        dateDispatchedForPimo: formatDate(bill.pimoMumbai?.dateGiven),
      }))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices Sent to PIMO Mumbai",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt recd at Site filled, Dt dispatched-PIMO filled, Dt recd at PIMO blank, Status Hold",
          sorting: ["Dt dispatched-PIMO (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices sent to PIMO Mumbai");
  }
};

// 7. Invoices Returned by QS Site after Measurement
export const getInvoicesReturnedByQsSite = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.qsMeasureGiven),
      ...dateFilled(FIELDS.qsMeasureReturn),
      siteStatus: "hold",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.qsMeasureReturn,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.qsMeasureReturn]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill, i) => ({
        ...compactInvoiceRow(bill, i),
        dateReturnedFromQsMeasurement: formatDate(
          bill.vendorFinalInv?.dateGiven
        ),
      }))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices Returned by QS Site after Measurement",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt given-QS for measure filled, Dt ret-QS aft measure filled, Status Hold",
          sorting: ["Dt ret-QS aft measure (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices returned by QS site after measurement");
  }
};

// 8. Invoices Returned by QS Site after Prov COP
export const getInvoicesReturnedByQsCOP = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.qsCopGiven),
      ...dateFilled(FIELDS.qsCopReturn),
      siteStatus: "hold",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.qsCopReturn,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.qsCopReturn]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill, i) => ({
        ...compactInvoiceRow(bill, i),
        dateReturnedFromQsCOP: formatDate(bill.copDetails?.dateReturned),
      }))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices Returned by QS Site after Prov COP",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt given-QS for Prov COP filled, Dt ret-QS aft Prov COP filled, Status Hold",
          sorting: ["Dt ret-QS aft Prov COP (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices returned by QS site after Prov COP");
  }
};

// 9. Invoices Returned by QS Mumbai after COP
export const getInvoicesReturnedByQSMumbai = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.qsMumbaiGiven),
      ...dateFilled(FIELDS.qsMumbaiReturn),
      siteStatus: "accept",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.qsMumbaiReturn,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.qsMumbaiReturn]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill, i) => ({
        ...compactInvoiceRow(bill, i),
        dateReturnedByQSMumbai: formatDate(
          bill.pimoMumbai?.dateReturnedFromQs
        ),
      }))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices Returned by QS Mumbai after COP",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt given-QS Mumbai for COP filled, Dt ret-PIMO by QS Mumbai filled, Status Accept",
          sorting: ["Dt ret-PIMO by QS Mumbai (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices returned by QS Mumbai after COP");
  }
};

// 10. Invoices Sent to Accts Team
export const getInvoicesGivenToAcctsDept = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.pimoReceived),
      ...dateBlank(FIELDS.acctsGiven),
      siteStatus: "accept",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.pimoReceived,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, { [FIELDS.pimoReceived]: -1 });
    const reportData = appendGrandTotal(
      bills.map((bill, i) => ({
        ...compactInvoiceRow(bill, i),
        dateGivenToAccounts: formatDate(bill.accountsDept?.dateGiven),
      }))
    );

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices Sent to Accts Team",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic:
            "Dt recd-PIMO from Site filled, Dt given-Accts blank, Status Accept",
          sorting: ["Dt recd-PIMO from Site (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices sent to Accts Team");
  }
};

// 11. Invoices Paid
export const getInvoicesPaid = async (req, res) => {
  try {
    const { region, f110Identification } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.paymentDate),
      siteStatus: "accept",
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.paymentDate,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    if (f110Identification) {
      filter["accountsDept.f110Identification"] = f110Identification;
    }

    const bills = await fetchBills(filter, { [FIELDS.paymentDate]: -1 });
    const rows = bills.map((bill) => ({
      srNo: blankOr(bill.srNo),
      dateOfPayment: formatDate(bill.accountsDept?.paymentDate),
      vendorNo: blankOr(bill.vendor?.vendorNo),
      vendorName: blankOr(bill.vendor?.vendorName),
      taxInvNo: blankOr(bill.taxInvNo),
      taxInvDate: formatDate(bill.taxInvDate),
      taxInvAmt: formatAmount(bill.taxInvAmt),
      copAmt: formatAmount(bill.copDetails?.amount),
      f110Identification: blankOr(bill.accountsDept?.f110Identification),
      paymentAmt: formatAmount(bill.accountsDept?.paymentAmt),
    }));

    const reportData = appendGrandTotal(rows, [
      "taxInvAmt",
      "copAmt",
      "paymentAmt",
    ]);

    return res.status(200).json(
      buildReportEnvelope({
        title: "Invoices Paid",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic: "Dt of payment filled, Status Accept",
          sorting: ["Dt of payment (Latest at top)"],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "invoices paid report");
  }
};

// 14. Bill Kidhar Report
export const getBillKidharReport = async (req, res) => {
  try {
    const { region, vendorName, paymentStatus } = req.query;
    const dateRange = resolveDateRange(req.query, {
      defaultStart: fiscalYearStartISO(),
      defaultEnd: todayISO(),
    });

    const filter = {
      ...dateFilled(FIELDS.taxInvRecdAtSite),
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.taxInvDate,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);
    applyPaymentStatusFilter(filter, paymentStatus);
    await applyVendorFilter(filter, vendorName);

    const bills = await fetchBills(filter, {});
    const sorted = sortUnpaidFirstThenAmountDesc(bills);
    const rows = sorted.map((bill) => billKidharRow(bill));
    const reportData = appendGrandTotal(rows, [
      "taxInvAmt",
      "copAmt",
      "paymentAmt",
    ]);

    return res.status(200).json(
      buildReportEnvelope({
        title: "Bill Kidhar Report",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          vendorName,
          paymentStatus,
          logic: "Dt recd at Site filled",
          sorting: [
            "Date of payment blank first",
            "Tax Inv Amt (Highest to Lowest)",
          ],
        }),
        data: reportData,
      })
    );
  } catch (error) {
    return handleReportError(res, error, "bill kidhar report");
  }
};

// 15. Bill Journey Report
export const getBillJourney = async (req, res) => {
  try {
    const { region, vendorName, srNo } = req.query;
    const dateRange = resolveDateRange(req.query, {
      defaultStart: fiscalYearStartISO(),
      defaultEnd: todayISO(),
    });

    const filter = {
      ...dateFilled(FIELDS.taxInvRecdAtSite),
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.taxInvDate,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);
    applySrNoFilter(filter, srNo);
    await applyVendorFilter(filter, vendorName);

    const bills = await fetchBills(filter, {});
    const sorted = sortUnpaidFirstThenAmountDesc(bills);

    let totalSiteDays = 0;
    let totalMumbaiDays = 0;
    let totalAccountsDays = 0;
    let totalPaymentDays = 0;
    let countSiteDays = 0;
    let countMumbaiDays = 0;
    let countAccountsDays = 0;
    let countPaymentDays = 0;
    let totalInvoiceAmount = 0;

    const reportData = sorted.map((bill) => {
      const checklist = billJourneyChecklistRow(bill);
      const invoiceAmount = parseFloat(bill.taxInvAmt || 0);
      totalInvoiceAmount += isNaN(invoiceAmount) ? 0 : invoiceAmount;

      const delayForReceiving = daysBetween(
        bill.taxInvDate,
        bill.taxInvRecdAtSite
      );
      const noOfDaysSite = daysBetween(
        bill.taxInvRecdAtSite,
        bill.siteOfficeDispatch?.dateGiven
      );
      const noOfDaysMumbai = daysBetween(
        bill.pimoMumbai?.dateReceived,
        bill.accountsDept?.dateGiven
      );
      const noOfDaysAC = daysBetween(
        bill.accountsDept?.dateReceived,
        bill.accountsDept?.paymentDate
      );
      const daysForPayment = daysBetween(
        bill.taxInvDate,
        bill.accountsDept?.paymentDate
      );

      if (noOfDaysSite !== "") {
        totalSiteDays += noOfDaysSite;
        countSiteDays++;
      }
      if (noOfDaysMumbai !== "") {
        totalMumbaiDays += noOfDaysMumbai;
        countMumbaiDays++;
      }
      if (noOfDaysAC !== "") {
        totalAccountsDays += noOfDaysAC;
        countAccountsDays++;
      }
      if (daysForPayment !== "") {
        totalPaymentDays += daysForPayment;
        countPaymentDays++;
      }

      return {
        ...checklist,
        selectable: true,
        delay_for_receiving_invoice: delayForReceiving,
        no_of_Days_Site: noOfDaysSite,
        no_of_Days_at_Mumbai: noOfDaysMumbai,
        no_of_Days_at_AC: noOfDaysAC,
        days_for_payment: daysForPayment,
      };
    });

    const dataWithTotal = appendGrandTotal(reportData, ["taxInvAmt", "copAmt", "paymentAmt"]);

    return res.status(200).json(
      buildReportEnvelope({
        title: "Bill Journey Report",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          vendorName,
          srNo,
          logic: "Dt recd at Site filled",
          sorting: [
            "Date of payment blank first",
            "Tax Inv Amt (Highest to Lowest)",
          ],
        }),
        data: dataWithTotal,
        summary: {
          totalCount: reportData.length,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
          averageProcessingDays: {
            siteProcessing:
              countSiteDays > 0
                ? Number((totalSiteDays / countSiteDays).toFixed(1))
                : 0,
            mumbaiProcessing:
              countMumbaiDays > 0
                ? Number((totalMumbaiDays / countMumbaiDays).toFixed(1))
                : 0,
            accountingProcessing:
              countAccountsDays > 0
                ? Number((totalAccountsDays / countAccountsDays).toFixed(1))
                : 0,
            totalPaymentDays:
              countPaymentDays > 0
                ? Number((totalPaymentDays / countPaymentDays).toFixed(1))
                : 0,
          },
        },
      })
    );
  } catch (error) {
    return handleReportError(res, error, "bill journey report");
  }
};

// Legacy pending bills - kept for backward compatibility, aligned with unpaid bills at site
export const getPendingBillsReport = async (req, res) => {
  try {
    const { region } = req.query;
    const dateRange = resolveDateRange(req.query);

    const filter = {
      ...dateFilled(FIELDS.taxInvRecdAtSite),
      ...dateBlank(FIELDS.paymentDate),
    };

    applyDateRangeToFilter(
      filter,
      FIELDS.taxInvRecdAtSite,
      dateRange.start,
      dateRange.end
    );
    applyRegionFilter(filter, region);

    const bills = await fetchBills(filter, {});

    const vendorGroups = {};
    bills.forEach((bill) => {
      const name = bill.vendor?.vendorName || "";
      if (!vendorGroups[name]) vendorGroups[name] = [];
      vendorGroups[name].push(bill);
    });

    const sortedVendorNames = Object.keys(vendorGroups).sort();
    let reportData = [];
    let totalInvoiceAmount = 0;
    let totalCount = 0;

    sortedVendorNames.forEach((name) => {
      const vendorBills = vendorGroups[name];
      vendorBills.sort((a, b) => {
        const aSr = parseInt(a.srNo) || 0;
        const bSr = parseInt(b.srNo) || 0;
        return aSr - bSr;
      });

      let vendorSubtotal = 0;

      vendorBills.forEach((bill) => {
        const invoiceAmount = parseFloat(bill.taxInvAmt || 0);
        vendorSubtotal += isNaN(invoiceAmount) ? 0 : invoiceAmount;
        totalInvoiceAmount += isNaN(invoiceAmount) ? 0 : invoiceAmount;
        totalCount++;

        reportData.push({
          srNo: blankOr(bill.srNo),
          projectDescription: blankOr(bill.projectDescription),
          vendorName: blankOr(bill.vendor?.vendorName),
          invoiceNo: blankOr(bill.taxInvNo),
          invoiceDate: formatDate(bill.taxInvDate),
          invoiceAmount: formatAmount(bill.taxInvAmt),
          dateInvoiceReceivedAtSite: formatDate(bill.taxInvRecdAtSite),
          dateBillReceivedAtPimo: formatDate(bill.pimoMumbai?.dateReceived),
          poNo: blankOr(bill.poNo),
        });
      });

      reportData.push({
        isSubtotal: true,
        vendorName: name,
        subtotalLabel: `Subtotal for ${name}:`,
        subtotalAmount: Number(vendorSubtotal.toFixed(2)),
        count: vendorBills.length,
      });
    });

    reportData.push({
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalAmount: Number(totalInvoiceAmount.toFixed(2)),
      count: totalCount,
    });

    return res.status(200).json(
      buildReportEnvelope({
        title: "Pending Bills Report",
        selectionCriteria: buildSelectionCriteria({
          dateRange,
          region,
          logic: "Dt recd at Site filled, Dt of payment blank",
          sorting: ["Vendor Name", "Sr No"],
        }),
        data: reportData,
        summary: {
          totalCount,
          totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
        },
      })
    );
  } catch (error) {
    return handleReportError(res, error, "pending bills report");
  }
};
