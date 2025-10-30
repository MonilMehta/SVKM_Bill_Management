import Bill from '../models/bill-model.js';
import User from '../models/user-model.js';
import WorkFlowFinal from '../models/workflow-final-model.js';
import mongoose from 'mongoose';

// Get overall system statistics
export const getSystemStats = async (req, res) => {
  try {
    // Count total bills and group by currency
    const billStats = await Bill.aggregate([
      {
        $group: {
          _id: '$currency',
          totalBills: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Count bills by workflow state
    const workflowStats = await Bill.aggregate([
      {
        $group: {
          _id: '$workflowState.currentState',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Get bills added in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentBillsCount = await Bill.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Get bills completed in the last 30 days
    const completedBillsCount = await Bill.countDocuments({
      'workflowState.currentState': 'Completed',
      'workflowState.lastUpdated': { $gte: thirtyDaysAgo }
    });
    
    // Get counts by user
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get recent activity
    const recentActivity = await WorkFlowFinal.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .populate('billId', 'srNo vendorName amount')
      .populate('actor', 'name role');
    
    // Calculate average processing time (from creation to completion)
    const avgProcessingTime = await Bill.aggregate([
      {
        $match: {
          'workflowState.currentState': 'Completed'
        }
      },
      {
        $project: {
          processingTimeMs: { 
            $subtract: ['$workflowState.lastUpdated', '$createdAt'] 
          }
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingTimeMs: { $avg: '$processingTimeMs' }
        }
      },
      {
        $project: {
          avgProcessingTimeDays: { 
            $divide: ['$avgProcessingTimeMs', 86400000] // Convert ms to days
          },
          _id: 0
        }
      }
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        billStats,
        workflowStats,
        recentBillsCount,
        completedBillsCount,
        userStats,
        recentActivity,
        avgProcessingTime: avgProcessingTime[0] || { avgProcessingTimeDays: 0 }
      }
    });
    
  } catch (error) {
    console.error('System stats error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to get system statistics",
      error: error.message
    });
  }
};

// Get vendor statistics
export const getVendorStats = async (req, res) => {
  try {
    // Top vendors by bill count
    const topVendorsByCount = await Bill.aggregate([
      {
        $group: {
          _id: '$vendorNo',
          vendorName: { $first: '$vendorName' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Top vendors by amount
    const topVendorsByAmount = await Bill.aggregate([
      {
        $group: {
          _id: '$vendorNo',
          vendorName: { $first: '$vendorName' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { totalAmount: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Average payment time by vendor
    const avgPaymentTimeByVendor = await Bill.aggregate([
      {
        $match: {
          paymentDate: { $ne: null }
        }
      },
      {
        $project: {
          vendorNo: 1,
          vendorName: 1,
          paymentTimeMs: { 
            $subtract: ['$paymentDate', '$billDate'] 
          }
        }
      },
      {
        $group: {
          _id: '$vendorNo',
          vendorName: { $first: '$vendorName' },
          avgPaymentTimeMs: { $avg: '$paymentTimeMs' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          vendorNo: '$_id',
          vendorName: 1,
          avgPaymentTimeDays: { 
            $divide: ['$avgPaymentTimeMs', 86400000] // Convert ms to days
          },
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { avgPaymentTimeDays: 1 }
      },
      {
        $limit: 10
      }
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        topVendorsByCount,
        topVendorsByAmount,
        avgPaymentTimeByVendor
      }
    });
    
  } catch (error) {
    console.error('Vendor stats error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to get vendor statistics",
      error: error.message
    });
  }
};

// Get bill statistics over time
export const getBillTimeStats = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    let dateFormat;
    let dateField;
    
    switch(period) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        dateField = { $dateToString: { format: dateFormat, date: '$createdAt' } };
        break;
      case 'weekly':
        dateFormat = '%Y-%U'; // Year-Week number
        dateField = { $dateToString: { format: dateFormat, date: '$createdAt' } };
        break;
      case 'monthly':
      default:
        dateFormat = '%Y-%m';
        dateField = { $dateToString: { format: dateFormat, date: '$createdAt' } };
        break;
    }
    
    // Bills created over time
    const billsOverTime = await Bill.aggregate([
      {
        $group: {
          _id: dateField,
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Bills completed over time
    const completedBillsOverTime = await Bill.aggregate([
      {
        $match: {
          'workflowState.currentState': 'Completed'
        }
      },
      {
        $group: {
          _id: { 
            $dateToString: { 
              format: dateFormat, 
              date: '$workflowState.lastUpdated' 
            } 
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        period,
        billsOverTime,
        completedBillsOverTime
      }
    });
    
  } catch (error) {
    console.error('Bill time stats error:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to get bill time statistics",
      error: error.message
    });
  }
};

export default {
  getSystemStats,
  getVendorStats,
  getBillTimeStats
}; 