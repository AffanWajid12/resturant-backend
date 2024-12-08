const express = require('express');
const jwt = require('jsonwebtoken');
const MenuItem = require('../models/menuItemModel'); // Adjust the path based on your folder structure
const Restaurant = require('../models/restaurantModel');
const User = require('../models/userModel');

const router = express.Router();

// Middleware to verify restaurant owner
const verifyRestaurantOwner = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Format: 'Bearer <token>'
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const ownerId = decoded.id;

    // Find the user and verify their role
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
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// Get all menu items for a specific restaurant
router.get('/:restaurantId/menu-items', verifyRestaurantOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Ensure the restaurant belongs to the logged-in owner
    const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: req.ownerId });
    if (!restaurant) {
      return res.status(403).json({ error: 'Access denied. This restaurant does not belong to you.' });
    }

    const menuItems = await MenuItem.find({ restaurant: restaurantId });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu items.' });
  }
});

// Add a new menu item
router.post('/:restaurantId/menu-items', verifyRestaurantOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Ensure the restaurant belongs to the logged-in owner
    const restaurant = await Restaurant.findOne({ _id: restaurantId, owner: req.ownerId });
    if (!restaurant) {
      return res.status(403).json({ error: 'Access denied. This restaurant does not belong to you.' });
    }

    const menuItem = new MenuItem({
      restaurant: restaurantId,
      ...req.body,
    });

    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add menu item.' });
  }
});

// Update a menu item
router.put('/menu-items/:menuItemId', verifyRestaurantOwner, async (req, res) => {
  try {
    const { menuItemId } = req.params;

    // Find the menu item and ensure the restaurant belongs to the logged-in owner
    const menuItem = await MenuItem.findById(menuItemId).populate('restaurant');
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    if (menuItem.restaurant.owner.toString() !== req.ownerId) {
      return res.status(403).json({ error: 'Access denied. This restaurant does not belong to you.' });
    }

    Object.assign(menuItem, req.body); // Update fields
    await menuItem.save();

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
});

// Delete a menu item
router.delete('/menu-items/:menuItemId', verifyRestaurantOwner, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    console.log(menuItemId)
    // Find the menu item and ensure the restaurant belongs to the logged-in owner
    const menuItem = await MenuItem.findById(menuItemId).populate('restaurant');
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    if (menuItem.restaurant.owner.toString() !== req.ownerId) {
      return res.status(403).json({ error: 'Access denied. This restaurant does not belong to you.' });
    }

    await menuItem.deleteOne();
    res.json({ message: 'Menu item deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item.' });
  }
});

module.exports = router;
