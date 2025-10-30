import Bill from "../models/bill-model.js";

const roleLevelMap = {
  site_officer: 1,
  site_pimo: 3,
  director: 4,
  accounts: 5,
};

export const getBillsAboveLevel = async (req, res) => {
  try {
    const { role } = req.params;

    if (!roleLevelMap[role]) {
      return res.status(400).json({
        success: false,
        message: "Invalid role provided",
      });
    }

    let query;
    switch (role) {
      case "site_officer":
        query = {
          $or: [
            { "pimoMumbai.dateReceived": { $ne: null } },
            {
              $and: [
                { siteStatus: { $in: ["proforma", "reject"] } },
                { "pimoMumbai.dateReceived": { $ne: null } },
                { "accountsDept.paymentDate": { $ne: null } },
              ],
            },
          ],
        };
        break;
      case "site_pimo":
        query = { "accountsDept.dateReceived": { $ne: null } };
        break;
      case "accounts":
        query = { "accountsDept.paymentDate": { $ne: null } };
        break;
      case "director":
        query = {
          $and: [
            { siteStatus: { $in: ["hold", "accept"] } },
            { "accountsDept.status": { $eq: "Paid" } },
          ],
        }
        break;
    }

    const bills = await Bill.find(query)
      .populate("region")
      .populate("currency")
      .populate("natureOfWork")
      .populate({
        path: "vendor",
        populate: [
          { path: "PANStatus", model: "PanStatusMaster" },
          { path: "complianceStatus", model: "ComplianceMaster" },
        ],
      });

    const mappedBills = bills.map((bill) => {
      const billObj = bill.toObject();
      billObj.region = Array.isArray(billObj.region)
        ? billObj.region.map((r) => r?.name || r)
        : billObj.region;
      billObj.currency = billObj.currency?.currency || billObj.currency || null;
      billObj.natureOfWork =
        billObj.natureOfWork?.natureOfWork || billObj.natureOfWork || null;

      if (billObj.vendor && typeof billObj.vendor === "object") {
        billObj.vendorNo = billObj.vendor.vendorNo;
        billObj.vendorName = billObj.vendor.vendorName;
        billObj.GSTNumber = billObj.vendor.GSTNumber;
        billObj.compliance206AB =
          billObj.vendor.complianceStatus.compliance206AB;
        billObj.panStatus = billObj.vendor.PANStatus.name;
      }

      delete billObj.vendor;
      return billObj;
    });
    return res.status(200).json({
      success: true,
      data: mappedBills,
    });
  } catch (error) {
    console.error("Error fetching bills above level:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bills above level",
      error: error.message,
    });
  }
};
