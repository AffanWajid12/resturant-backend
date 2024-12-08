const express = require('express');
const { getOrders, updateOrderStatus, createOrder } = require('../controllers/orderController');

const router = express.Router();
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Extract the token from the header
  if (!token) {
    return res.status(401).json({ error: 'Access Denied. No token provided.' });
  }

  try {
    // Verify token and extract user details
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach the decoded user info to the request object
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};
// Get all orders
router.get('/', authenticateToken,getOrders);

// Create a new order
router.post('/', createOrder);

// Update order status
router.patch('/:orderId/status',authenticateToken, updateOrderStatus);

module.exports = router;
