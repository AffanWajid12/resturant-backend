const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Restaurant = require('../models/restaurantModel'); // Adjust paths as needed
const Order = require('../models/orderModel'); // Assuming you have an Order model for tracking sales
const User = require('../models/userModel');
const mongoose = require('mongoose');
// Middleware to verify and get owner ID from the JWT
const verifyRestaurantOwner = async (req, res, next) => {
  
    try {
      
      const token = req.headers.authorization?.split(' ')[1]; // Format: 'Bearer <token>'
      
      if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }
    
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace `process.env.JWT_SECRET` with your actual secret
      
      const ownerId = decoded.id;
      
      // Query the user's role from the database
      const user = await User.findById(ownerId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
  
      if (user.role !== 'restaurant') {
        return res.status(403).json({ error: 'Access denied. Only restaurant owners can access this resource.' });
      }
  
      req.ownerId = ownerId; // Attach ownerId to the request object for further use
      next();
    } catch (error) {
      console.log(error)
      res.status(400).json({ error: error});
    }
  };
// Generate sales reports by day, week, or month
router.post('/sales-report', verifyRestaurantOwner, async (req, res) => {
  try {
    const { restaurantId, period } = req.body;
    
    // Validate restaurantId format
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ error: 'Invalid restaurant ID format' });
    }
    
    // Find the restaurant (make sure it belongs to the authenticated owner)
    const restaurant = await Restaurant.findOne({ 
      _id: restaurantId, 
      owner: req.ownerId 
    });
    
    if (!restaurant) {
      return res.status(404).json({ 
        error: 'Restaurant not found or unauthorized access' 
      });
    }

    // Calculate date range
    const dateRange = calculateDateRange(period);
    if (!dateRange.success) {
      return res.status(400).json({ error: dateRange.error });
    }

    // Modified match condition to use estimatedDeliveryTime if createdAt is not available
    const matchStage = {
      restaurant: new mongoose.Types.ObjectId(restaurantId),
      $or: [
        {
          estimatedDeliveryTime: { 
            $gte: dateRange.startDate,
            $lte: dateRange.endDate 
          }
        },
        {
          createdAt: { 
            $gte: dateRange.startDate,
            $lte: dateRange.endDate 
          }
        }
      ]
    };

    // Debug: First check what orders exist
    const allOrders = await Order.find({
      restaurant: new mongoose.Types.ObjectId(restaurantId)
    }).lean();
    

    // Aggregate orders with detailed metrics
    const orders = await Order.aggregate([
      {
        $match: matchStage
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$finalTotal' },
          totalOrders: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } },
          totalDiscounts: { $sum: '$discount' },
          orders: { $push: '$$ROOT' }
        }
      }
    ]);


    const report = orders.length > 0 ? {
      ...orders[0],
      averageOrderValue: orders[0].totalSales / orders[0].totalOrders,
      periodRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }
    } : {
      totalSales: 0,
      totalOrders: 0,
      totalItems: 0,
      totalDiscounts: 0,
      averageOrderValue: 0,
      periodRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }
    };

    res.status(200).json(report);

  } catch (error) {
    console.error('Sales report generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate sales report',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Helper function to calculate date range
function calculateDateRange(period) {
  const now = new Date();
  let startDate, endDate;

  try {
    // Set end date to end of current day in local time
    endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case 'day':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const dayOfWeek = startDate.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - diff);
        break;
      case 'month':
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        return { 
          success: false, 
          error: 'Invalid period. Use "day", "week", or "month".' 
        };
    }
    return { success: true, startDate, endDate };
  } catch (error) {
    return { 
      success: false, 
      error: 'Error calculating date range' 
    };
  }
}

// View trends for popular items or peak ordering hours
router.post('/popular-items', verifyRestaurantOwner, async (req, res) => {
  try {
    const { restaurantId } = req.body;
    // Correctly use new mongoose.Types.ObjectId
    const restaurant = await Restaurant.findOne({ _id: new mongoose.Types.ObjectId(restaurantId), owner: req.ownerId });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found or unauthorized access.' });
    }

    const popularItems = await Order.aggregate([
      { $match: { restaurant: new mongoose.Types.ObjectId(restaurantId) } }, // Match orders from the restaurant
      { $unwind: '$items' }, // Unwind items array to process each item individually
      {
        $lookup: {
          from: 'menuitems', // Collection name for MenuItem (mongoose pluralizes model names)
          localField: 'items.menuItem', // field in OrderItem schema that references MenuItem
          foreignField: '_id', // field in MenuItem schema to match
          as: 'menuItemDetails', // name for the output array containing menu item data
        },
      },
      { $unwind: '$menuItemDetails' }, // Unwind the menu item details to access the name
      {
        $group: {
          _id: '$menuItemDetails.name', // Group by item name
          totalSold: { $sum: '$items.quantity' }, // Sum the quantity sold
        },
      },
      { $sort: { totalSold: -1 } }, // Sort by most sold
      { $limit: 10 }, // Limit to top 10 items
    ]);

    
    res.status(200).json(popularItems); // Return the result
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch popular items', message: error.message });
  }
});


// Export data for external analysis or accounting
router.post('/export-data', verifyRestaurantOwner, async (req, res) => {
  try {
    const { restaurantId, format } = req.body;

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Must be "csv" or "json".' });
    }

    const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: req.ownerId });
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found or unauthorized access.' });
    }

    const orders = await Order.find({ restaurant: restaurantId }).populate('items.menuItem');

    if (format === 'csv') {
      const csvData = orders.map(order => ({
        orderId: order._id,
        totalAmount: order.finalTotal,  // Use finalTotal for the total amount
       
        items: order.items.map(item => `${item.menuItem.name} (x${item.quantity})`).join(', '), // Correct mapping to menuItem name
      }));

      // Convert to CSV (using json2csv package)
      const { Parser } = require('json2csv');
      const parser = new Parser();
      const csv = parser.parse(csvData);

      res.header('Content-Type', 'text/csv');
      res.attachment('sales_report.csv');
      res.send(csv);
    } else {
      res.status(200).json(orders);  // Return JSON format if requested
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to export data', message: error.message });
  }
});


module.exports = router;
