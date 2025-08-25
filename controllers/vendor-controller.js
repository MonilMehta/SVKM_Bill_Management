import VendorMaster from "../models/vendor-master-model.js";

export const createVendor = async (req, res) => {
  try {
    const {
      vendorNo,
      vendorName,
      PAN,
      GSTNumber,
      complianceStatus,
      PANStatus,
      emailIds,
      phoneNumbers,
      addl1,
      addl2,
    } = req.body;

    const existingVendor = await VendorMaster.findOne({ vendorNo });
    if (existingVendor) {
      return res.status(400).json({ message: "Vendor already exists" });
    }

    const vendor = new VendorMaster({
      vendorNo,
      vendorName,
      PAN,
      GSTNumber,
      complianceStatus,
      PANStatus,
      emailIds,
      phoneNumbers,
      addl1,
      addl2,
    });

    await vendor.save();
    res.status(201).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVendors = async (req, res) => {
  try {
    const vendors = await VendorMaster.find();
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getVendorById = async (req, res) => {
  try {
    const vendor = await VendorMaster.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const updatedVendor = await VendorMaster.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.status(200).json(updatedVendor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteVendor = async (req, res) => {
  try {
    const deletedVendor = await VendorMaster.findByIdAndDelete(req.params.id);
    if (!deletedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
