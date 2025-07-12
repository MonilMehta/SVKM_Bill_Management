// Master Controller for all master tables
import Vendor from '../models/vendor-master-model.js';
import Compliance from '../models/compliance-master-model.js';
import User from '../models/user-model.js';
import RegionMaster from '../models/region-master-model.js';
// The following models are stubs and should be created in models/ as needed
// import PanStatus from '../models/pan-status-master-model.js';
// import Region from '../models/region-master-model.js';
// import NatureOfWork from '../models/natureofwork-master-model.js';
// import Currency from '../models/currency-master-model.js';

const masterController = {
  // Vendor Master CRUD
  async createVendor(req, res) {
    try {
      const vendorData = { ...req.body };
      
      // Convert compliance status name to ObjectId
      if (req.body.complianceStatus) {
        const compliance = await Compliance.findOne({ 
          compliance206AB: req.body.complianceStatus 
        });
        if (!compliance) {
          return res.status(400).json({ 
            error: `Compliance status '${req.body.complianceStatus}' not found. Please use a valid compliance status.` 
          });
        }
        vendorData.complianceStatus = compliance._id;
      }
      
      // Convert PAN status name to ObjectId
      if (req.body.PANStatus) {
        const PanStatus = (await import('../models/pan-status-master-model.js')).default;
        const panStatus = await PanStatus.findOne({ 
          name: req.body.PANStatus.toUpperCase() 
        });
        if (!panStatus) {
          return res.status(400).json({ 
            error: `PAN status '${req.body.PANStatus}' not found. Please use a valid PAN status.` 
          });
        }
        vendorData.PANStatus = panStatus._id;
      }
      
      const vendor = new Vendor(vendorData);
      await vendor.save();
      
      // Populate and return with names instead of IDs
      await vendor.populate('complianceStatus', 'compliance206AB');
      await vendor.populate('PANStatus', 'name description');
      
      // Transform response to show names instead of ObjectIds
      const response = vendor.toObject();
      response.complianceStatus = vendor.complianceStatus?.compliance206AB || null;
      response.PANStatus = vendor.PANStatus?.name || null;
      
      res.status(201).json(response);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async getVendors(req, res) {
    try {
      const vendors = await Vendor.find()
        .populate('complianceStatus', 'compliance206AB')
        .populate('PANStatus', 'name description');
      
      // Transform response to show names instead of ObjectId references
      const transformedVendors = vendors.map(vendor => {
        const vendorObj = vendor.toObject();
        vendorObj.complianceStatus = vendor.complianceStatus?.compliance206AB || null;
        vendorObj.PANStatus = vendor.PANStatus?.name || null;
        return vendorObj;
      });
      
      res.json(transformedVendors);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async getVendorById(req, res) {
    try {
      const vendor = await Vendor.findById(req.params.id)
        .populate('complianceStatus', 'compliance206AB')
        .populate('PANStatus', 'name description');
      
      if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
      
      res.json(vendor);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async updateVendor(req, res) {
    try {
      const updateData = { ...req.body };
      
      // Convert compliance status name to ObjectId if provided
      if (req.body.complianceStatus) {
        const compliance = await Compliance.findOne({ 
          compliance206AB: req.body.complianceStatus 
        });
        if (!compliance) {
          return res.status(400).json({ 
            error: `Compliance status '${req.body.complianceStatus}' not found. Please use a valid compliance status.` 
          });
        }
        updateData.complianceStatus = compliance._id;
      }
      
      // Convert PAN status name to ObjectId if provided
      if (req.body.PANStatus) {
        const PanStatus = (await import('../models/pan-status-master-model.js')).default;
        const panStatus = await PanStatus.findOne({ 
          name: req.body.PANStatus.toUpperCase() 
        });
        if (!panStatus) {
          return res.status(400).json({ 
            error: `PAN status '${req.body.PANStatus}' not found. Please use a valid PAN status.` 
          });
        }
        updateData.PANStatus = panStatus._id;
      }
      
      const vendor = await Vendor.findByIdAndUpdate(req.params.id, updateData, { new: true })
        .populate('complianceStatus', 'compliance206AB')
        .populate('PANStatus', 'name description');
      
      if (!vendor) {
        return res.status(404).json({ error: 'Vendor not found' });
      }
      
      // Transform response to show names instead of ObjectIds
      const response = vendor.toObject();
      response.complianceStatus = vendor.complianceStatus?.compliance206AB || null;
      response.PANStatus = vendor.PANStatus?.name || null;
      
      res.json(response);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async deleteVendor(req, res) {
    try {
      await Vendor.findByIdAndDelete(req.params.id);
      res.json({ message: 'Vendor deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Compliance Master CRUD
  async createCompliance(req, res) {
    try {
      const compliance = new Compliance(req.body);
      await compliance.save();
      res.status(201).json(compliance);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async getCompliances(req, res) {
    try {
      const compliances = await Compliance.find();
      res.json(compliances);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async updateCompliance(req, res) {
    try {
      const compliance = await Compliance.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(compliance);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async deleteCompliance(req, res) {
    try {
      await Compliance.findByIdAndDelete(req.params.id);
      res.json({ message: 'Compliance deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // User Master CRUD
  async createUser(req, res) {
    try {
      const user = new User(req.body);
      await user.save();
      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async getUsers(req, res) {
    try {
      const users = await User.find();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async updateUser(req, res) {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(user);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async deleteUser(req, res) {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.json({ message: 'User deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // PAN Status Master CRUD
  async createPanStatus(req, res) {
    try {
      const panStatus = new (await import('../models/pan-status-master-model.js')).default(req.body);
      await panStatus.save();
      res.status(201).json(panStatus);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async getPanStatuses(req, res) {
    try {
      const PanStatus = (await import('../models/pan-status-master-model.js')).default;
      const panStatuses = await PanStatus.find();
      res.json(panStatuses);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async updatePanStatus(req, res) {
    try {
      const PanStatus = (await import('../models/pan-status-master-model.js')).default;
      const panStatus = await PanStatus.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(panStatus);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async deletePanStatus(req, res) {
    try {
      const PanStatus = (await import('../models/pan-status-master-model.js')).default;
      await PanStatus.findByIdAndDelete(req.params.id);
      res.json({ message: 'PAN Status deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Region Master CRUD (stub)
  async createRegion(req, res) {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Region name is required' });
      const region = new RegionMaster({ name: name.toUpperCase() });
      await region.save();
      res.status(201).json(region);
    } catch (err) {
      if (err.code === 11000) {
        res.status(409).json({ error: 'Region already exists' });
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  },

  // Get all regions
  async getRegions(req, res) {
    try {
      const regions = await RegionMaster.find().sort({ name: 1 });
      res.json(regions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Update a region
  async updateRegion(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Region name is required' });
      const region = await RegionMaster.findByIdAndUpdate(id, { name: name.toUpperCase() }, { new: true });
      if (!region) return res.status(404).json({ error: 'Region not found' });
      res.json(region);
    } catch (err) {
      if (err.code === 11000) {
        res.status(409).json({ error: 'Region already exists' });
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  },

  // Delete a region
  async deleteRegion(req, res) {
    try {
      const { id } = req.params;
      const region = await RegionMaster.findByIdAndDelete(id);
      if (!region) return res.status(404).json({ error: 'Region not found' });
      res.json({ message: 'Region deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Nature of Work Master CRUD
  async createNatureOfWork(req, res) {
    try {
      const NatureOfWork = (await import('../models/nature-of-work-master-model.js')).default;
      const natureOfWork = new NatureOfWork(req.body);
      await natureOfWork.save();
      res.status(201).json(natureOfWork);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async getNatureOfWorks(req, res) {
    try {
      const NatureOfWork = (await import('../models/nature-of-work-master-model.js')).default;
      const natureOfWorks = await NatureOfWork.find();
      res.json(natureOfWorks);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async updateNatureOfWork(req, res) {
    try {
      const NatureOfWork = (await import('../models/nature-of-work-master-model.js')).default;
      const natureOfWork = await NatureOfWork.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(natureOfWork);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async deleteNatureOfWork(req, res) {
    try {
      const NatureOfWork = (await import('../models/nature-of-work-master-model.js')).default;
      await NatureOfWork.findByIdAndDelete(req.params.id);
      res.json({ message: 'Nature of Work deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // Currency Master CRUD
  async createCurrency(req, res) {
    try {
      const Currency = (await import('../models/currency-master-model.js')).default;
      const currency = new Currency(req.body);
      await currency.save();
      res.status(201).json(currency);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async getCurrencies(req, res) {
    try {
      const Currency = (await import('../models/currency-master-model.js')).default;
      const currencies = await Currency.find();
      res.json(currencies);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  async updateCurrency(req, res) {
    try {
      const Currency = (await import('../models/currency-master-model.js')).default;
      const currency = await Currency.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(currency);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  async deleteCurrency(req, res) {
    try {
      const Currency = (await import('../models/currency-master-model.js')).default;
      await Currency.findByIdAndDelete(req.params.id);
      res.json({ message: 'Currency deleted' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
};

export default masterController;
