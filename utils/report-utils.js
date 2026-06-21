import VendorMaster from "../models/vendor-master-model.js";

/**
 * Spreadsheet column semantics mapped to bill schema paths.
 * Column numbers in the spec refer to these business field names.
 */
export const FIELDS = {
  taxInvRecdAtSite: "taxInvRecdAtSite",
  pimoDispatch: "pimoMumbai.dateGiven",
  pimoReceived: "pimoMumbai.dateReceived",
  qsMeasureGiven: "qsMeasurementCheck.dateGiven",
  qsMeasureReturn: "vendorFinalInv.dateGiven",
  qsCopGiven: "qsCOP.dateGiven",
  qsCopReturn: "copDetails.dateReturned",
  qsMumbaiGiven: "qsMumbai.dateGiven",
  qsMumbaiReturn: "pimoMumbai.dateReturnedFromQs",
  acctsGiven: "accountsDept.dateGiven",
  acctsReceived: "accountsDept.dateReceived",
  paymentDate: "accountsDept.paymentDate",
  siteStatus: "siteStatus",
  taxInvDate: "taxInvDate",
  taxInvAmt: "taxInvAmt",
  region: "region",
};

export const endOfDay = (dateString) => {
  const date = new Date(dateString);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const startOfDay = (dateString) => {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const formatDate = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${date.getFullYear()}`;
};

export const formatDateTime = (dateValue = new Date()) => {
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";
  const datePart = formatDate(date);
  const timePart = `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
  return `${datePart} ${timePart}`;
};

export const formatAmount = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  return Number(num.toFixed(2));
};

export const blankOr = (value) => {
  if (value === null || value === undefined) return "";
  return value;
};

export const dateFilled = (fieldPath) => ({
  [fieldPath]: { $ne: null, $exists: true },
});

export const dateBlank = (fieldPath) => ({
  [fieldPath]: { $eq: null },
});

export const todayISO = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

export const fiscalYearStartISO = () => "2025-04-01";

/**
 * Resolve date range from query params with configurable defaults.
 */
export const resolveDateRange = (
  query,
  { defaultStart = todayISO(), defaultEnd = todayISO() } = {}
) => {
  const startDate = query.startDate || defaultStart;
  const endDate = query.endDate || defaultEnd;
  return {
    startDate,
    endDate,
    start: startOfDay(startDate),
    end: endOfDay(endDate),
  };
};

export const applyDateRangeToFilter = (filter, fieldPath, start, end) => {
  filter[fieldPath] = { $gte: start, $lte: end };
};

export const applyRegionFilter = (filter, region) => {
  if (region) {
    filter.region = region.toUpperCase();
  }
};

export const applySiteStatusFilter = (filter, status) => {
  if (status) {
    filter.siteStatus = status.toLowerCase();
  }
};

export const applyPaymentStatusFilter = (filter, paymentStatus) => {
  if (!paymentStatus) return;
  const normalized = paymentStatus.toLowerCase();
  if (normalized === "paid") {
    filter["accountsDept.paymentDate"] = { $ne: null, $exists: true };
  } else if (normalized === "unpaid") {
    filter["accountsDept.paymentDate"] = { $eq: null };
  }
};

export const applySrNoFilter = (filter, srNo) => {
  if (srNo) {
    filter.srNo = srNo;
  }
};

export const applyVendorFilter = async (filter, vendorName) => {
  if (!vendorName) return;
  const vendor = await VendorMaster.findOne({
    vendorName: { $regex: vendorName.trim(), $options: "i" },
  });
  if (vendor) {
    filter.vendor = vendor._id;
  } else {
    filter.vendor = null;
  }
};

export const standardInvoiceRow = (bill) => ({
  srNo: blankOr(bill.srNo),
  region: blankOr(bill.region),
  projectDescription: blankOr(bill.projectDescription),
  vendorNo: blankOr(bill.vendor?.vendorNo),
  vendorName: blankOr(bill.vendor?.vendorName),
  taxInvNo: blankOr(bill.taxInvNo),
  taxInvDate: formatDate(bill.taxInvDate),
  taxInvAmt: formatAmount(bill.taxInvAmt),
  poNo: blankOr(bill.poNo),
});

export const compactInvoiceRow = (bill, index) => ({
  count: index + 1,
  srNo: blankOr(bill.srNo),
  vendorName: blankOr(bill.vendor?.vendorName),
  taxInvNo: blankOr(bill.taxInvNo),
  taxInvDate: formatDate(bill.taxInvDate),
  taxInvAmt: formatAmount(bill.taxInvAmt),
});

export const sortUnpaidFirstThenAmountDesc = (bills) => {
  return [...bills].sort((a, b) => {
    const aPaid = a.accountsDept?.paymentDate ? 1 : 0;
    const bPaid = b.accountsDept?.paymentDate ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;
    return (b.taxInvAmt || 0) - (a.taxInvAmt || 0);
  });
};

export const daysBetween = (date1, date2) => {
  if (!date1 || !date2) return "";
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return "";
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Append grand total row with count and summed amount columns.
 */
export const appendGrandTotal = (rows, amountFields = ["taxInvAmt"]) => {
  const dataRows = rows.filter((r) => !r.isGrandTotal && !r.isSubtotal);
  const totals = {};
  for (const field of amountFields) {
    totals[field] = Number(
      dataRows
        .reduce((sum, row) => sum + (Number(row[field]) || 0), 0)
        .toFixed(2)
    );
  }
  return [
    ...rows,
    {
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      count: dataRows.length,
      ...Object.fromEntries(
        amountFields.map((f) => [`grandTotal_${f}`, totals[f]])
      ),
      ...totals,
    },
  ];
};

export const buildSelectionCriteria = ({
  dateRange,
  region,
  vendorName,
  paymentStatus,
  srNo,
  logic,
  sorting,
}) => {
  const criteria = {};
  if (dateRange) {
    criteria.dateRange = `From ${dateRange.startDate} to ${dateRange.endDate}`;
  }
  if (region) criteria.region = region;
  if (vendorName) criteria.vendorName = vendorName;
  if (paymentStatus) criteria.paymentStatus = paymentStatus;
  if (srNo) criteria.srNo = srNo;
  if (logic) criteria.logic = logic;
  if (sorting) criteria.sorting = sorting;
  return criteria;
};

export const buildReportEnvelope = ({
  title,
  selectionCriteria,
  data,
  summary,
}) => {
  const now = new Date();
  return {
    report: {
      title,
      generatedAt: now.toISOString(),
      generatedAtFormatted: formatDateTime(now),
      selectionCriteria,
      data,
      ...(summary ? { summary } : {}),
    },
  };
};

export const billJourneyChecklistRow = (bill) => ({
  _id: bill._id,
  srNo: blankOr(bill.srNo),
  region: blankOr(bill.region),
  projectDescription: blankOr(bill.projectDescription),
  vendorNo: blankOr(bill.vendor?.vendorNo),
  vendorName: blankOr(bill.vendor?.vendorName),
  taxInvNo: blankOr(bill.taxInvNo),
  taxInvDate: formatDate(bill.taxInvDate),
  taxInvAmt: formatAmount(bill.taxInvAmt),
  taxInvRecdAtSite: formatDate(bill.taxInvRecdAtSite),
  qsMeasureGiven: formatDate(bill.qsMeasurementCheck?.dateGiven),
  qsMeasureReturn: formatDate(bill.vendorFinalInv?.dateGiven),
  qsCopGiven: formatDate(bill.qsCOP?.dateGiven),
  qsCopReturn: formatDate(bill.copDetails?.dateReturned),
  copAmt: formatAmount(bill.copDetails?.amount),
  siteDispatch: formatDate(bill.siteOfficeDispatch?.dateGiven),
  pimoDispatch: formatDate(bill.pimoMumbai?.dateGiven),
  pimoReceived: formatDate(bill.pimoMumbai?.dateReceived),
  qsMumbaiGiven: formatDate(bill.qsMumbai?.dateGiven),
  qsMumbaiReturn: formatDate(bill.pimoMumbai?.dateReturnedFromQs),
  acctsGiven: formatDate(bill.accountsDept?.dateGiven),
  acctsReceived: formatDate(bill.accountsDept?.dateReceived),
  paymentDate: formatDate(bill.accountsDept?.paymentDate),
  paymentAmt: formatAmount(bill.accountsDept?.paymentAmt),
  f110Identification: blankOr(bill.accountsDept?.f110Identification),
});

export const billKidharRow = (bill) => ({
  srNo: blankOr(bill.srNo),
  region: blankOr(bill.region),
  vendorNo: blankOr(bill.vendor?.vendorNo),
  vendorName: blankOr(bill.vendor?.vendorName),
  taxInvNo: blankOr(bill.taxInvNo),
  taxInvDate: formatDate(bill.taxInvDate),
  taxInvAmt: formatAmount(bill.taxInvAmt),
  copAmt: formatAmount(bill.copDetails?.amount),
  paymentAmt: formatAmount(bill.accountsDept?.paymentAmt),
  paymentDate: formatDate(bill.accountsDept?.paymentDate),
  taxInvRecdAtSite: formatDate(bill.taxInvRecdAtSite),
  qsMeasureGiven: formatDate(bill.qsMeasurementCheck?.dateGiven),
  qsCopGiven: formatDate(bill.qsCOP?.dateGiven),
  pimoReceived: formatDate(bill.pimoMumbai?.dateReceived),
  qsMumbaiGiven: formatDate(bill.qsMumbai?.dateGiven),
  acctsReceived: formatDate(bill.accountsDept?.dateReceived),
});
