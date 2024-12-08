const Order =require('../models/orderModel')
const Notification = require('../models/notificationModel'); 
const User = require('../models/userModel'); // Assuming User model path
const Restaurant = require('../models/restaurantModel'); // Assuming Restaurant model path
const jwt = require('jsonwebtoken'); // For token verification

// Get all orders with real-time statuses
const getOrders = async (req, res) => {
  try {
    // Extract token from headers
      const token = req.headers.authorization?.split(' ')[1]; // Format: 'Bearer <token>'
      if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace `process.env.JWT_SECRET` with your actual secret
      const ownerId = decoded.id;
      // Query the user's role from the database
      const user = await User.findById(ownerId);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
  
      const role = user.role; // Assuming the `role` field exists in the User model

      // Check if the user has the correct role
      if (role !== 'restaurant') {
        return res.status(403).json({ error: 'Access denied. Only restaurant owners can access this resource.' });
      }

    // Find restaurants owned by the given ownerId
    const restaurants = await Restaurant.find({ owner: ownerId });

    if (!restaurants.length) {
      return res.status(404).json({ message: 'No restaurants found for this owner.' });
    }

    // Extract restaurant IDs
    const restaurantIds = restaurants.map((restaurant) => restaurant._id);

    // Find orders for these restaurants
    const orders = await Order.find({ restaurant: { $in: restaurantIds } })
      .populate('user', 'username email') // Populate specific user fields
      .populate('restaurant', 'name address') // Populate specific restaurant fields
      .sort({ createdAt: -1 }); // Sort by most recent orders

    // Respond with the fetched orders
    res.status(200).json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders', message: err.message });
  }
};
// Update order status and notify customer
const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus } = req.body;


  try {
    // Validate the input status
    const validStatuses = ['Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order status
    order.orderStatus = orderStatus;
    await order.save(); // Ensure the update is completed

    console.log(`Order ${orderId} updated to status: ${orderStatus}`);

    // Send notification to the customer
    if (order.user) {
      await Notification.create({
        recipient: order.user,
        type: `${orderStatus}`,
        title: `Your order is now ${orderStatus}`,
        message: `Order #${orderId} status has been updated to "${orderStatus}".`,
        relatedEntity: {
          entityType: 'Order',
          entityId: order._id,
        },
      });

      console.log(`Notification sent to user: ${order.user}`);
    } else {
      console.warn(`No user associated with order: ${orderId}`);
    }

    // Respond with success
    return res.status(200).json({ message: 'Order status updated and customer notified' });

  } catch (err) {
    // Log and respond with error details
    console.error('Error updating order status:', err.message);
    return res.status(500).json({
      error: 'Failed to update order status',
      message: err.message,
    });
  }
};

// Create a new order
const createOrder = async (req, res) => {
  const orderData = req.body;

  try {
    const newOrder = await Order.create(orderData);
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order', message: err.message });
  }
};

module.exports = { getOrders, updateOrderStatus, createOrder };