import VendorMaster from "../models/vendor-master-model.js";

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

/** Handles region[]=MUMBAI and other array query params from the frontend. */
export const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) {
    return value.length ? value[0] : undefined;
  }
  return value;
};

export const formatDate = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return null;
  return `${String(date.getDate()).padStart(2, "0")}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${date.getFullYear()}`;
};

export const fmt = (dateValue) => formatDate(dateValue) || "";

export const dateFilled = (fieldPath) => ({
  [fieldPath]: { $ne: null, $exists: true },
});

export const dateBlank = (fieldPath) => ({
  [fieldPath]: { $eq: null },
});

export const applyOptionalDateRange = (filter, fieldPath, query) => {
  const startDate = normalizeQueryValue(query.startDate);
  const endDate = normalizeQueryValue(query.endDate);
  if (startDate && endDate) {
    filter[fieldPath] = {
      $gte: startOfDay(startDate),
      $lte: endOfDay(endDate),
    };
  }
};

export const applyRegionFilter = (filter, region) => {
  const value = normalizeQueryValue(region);
  if (value) {
    filter.region = value;
  }
};

export const applyVendorFilter = async (filter, vendorName) => {
  const value = normalizeQueryValue(vendorName);
  if (!value) return;
  const vendor = await VendorMaster.findOne({
    vendorName: { $regex: String(value).trim(), $options: "i" },
  });
  if (vendor) {
    filter.vendor = vendor._id;
  }
};

export const buildReportResponse = (title, filterCriteria, data, extra = {}) => ({
  report: {
    title,
    generatedAt: new Date().toISOString(),
    filterCriteria,
    data,
    ...extra,
  },
});

export const appendGrandTotalTaxAmount = (rows) => {
  const dataRows = rows.filter((r) => !r.isGrandTotal && !r.isSubtotal);
  const totalTaxInvAmt = dataRows.reduce(
    (sum, item) => sum + (Number(item.taxInvAmt) || 0),
    0
  );
  const count = dataRows.length;
  return [
    ...rows,
    {
      count,
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
    },
  ];
};

export const appendGrandTotalCourierStyle = (rows) => {
  const dataRows = rows.filter((r) => !r.isGrandTotal && !r.isSubtotal);
  const totalTaxInvAmt = dataRows.reduce(
    (sum, item) => sum + (Number(item.taxInvAmt) || 0),
    0
  );
  const count = dataRows.length;
  return [
    ...rows,
    {
      isGrandTotal: true,
      grandTotalLabel: "Grand Total",
      grandTotalTaxAmount: totalTaxInvAmt,
      count,
    },
  ];
};

export const sortUnpaidFirstThenAmountDesc = (bills) => {
  return [...bills].sort((a, b) => {
    const aPaid = a.accountsDept?.paymentDate ? 1 : 0;
    const bPaid = b.accountsDept?.paymentDate ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;
    return (b.taxInvAmt || 0) - (a.taxInvAmt || 0);
  });
};

export const daysBetween = (date1, date2) => {
  if (!date1 || !date2) return null;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const fiscalYearStartISO = () => "2025-04-01";
export const todayISO = () => new Date().toISOString().split("T")[0];

export const applyKidharJourneyDateRange = (filter, query) => {
  const startDate = normalizeQueryValue(query.startDate) || fiscalYearStartISO();
  const endDate = normalizeQueryValue(query.endDate) || todayISO();
  filter.taxInvDate = {
    $gte: startOfDay(startDate),
    $lte: endOfDay(endDate),
  };
  return { startDate, endDate };
};

export const applyPaymentStatusFilter = (filter, paymentStatus) => {
  const value = normalizeQueryValue(paymentStatus);
  if (!value) return;
  const normalized = String(value).toLowerCase();
  if (normalized === "paid") {
    filter["accountsDept.paymentDate"] = { $ne: null, $exists: true };
  } else if (normalized === "unpaid") {
    filter["accountsDept.paymentDate"] = { $eq: null };
  }
};

export const applySrNoFilter = (filter, srNo) => {
  const value = normalizeQueryValue(srNo);
  if (value) {
    filter.srNo = value;
  }
};
