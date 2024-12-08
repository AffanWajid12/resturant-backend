// routes/restaurantRoutes.js
const express = require('express');
const Restaurant = require('../models/restaurantModel');
const User = require('../models/userModel');
const router = express.Router();
const jwt = require('jsonwebtoken');
// Create a new restaurant
router.post('/', async (req, res) => {
  const { name, owner, description, cuisine, address, contactNumber, email, operatingHours, isActive, rating, profilePicture, coverImage } = req.body;

  try {
    // Check if the owner is a valid user
    const user = await User.findById(owner);
    if (!user) {
      return res.status(400).json({ error: 'Owner not found' });
    }

    const newRestaurant = new Restaurant({
      name,
      owner,
      description,
      cuisine,
      address,
      contactNumber,
      email,
      operatingHours,
      isActive,
      rating,
      profilePicture,
      coverImage
    });

    await newRestaurant.save();
    res.status(201).json(newRestaurant);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create restaurant', message: err.message });
  }
});
  
// Get all restaurants (for testing purposes)
router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.find().populate('owner');
    res.status(200).json(restaurants);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch restaurants', message: err.message });
  }
});
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

// Get all restaurants owned by the authenticated user
router.get('/owner-restaurants', verifyRestaurantOwner, async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ owner: req.ownerId });

    if (!restaurants.length) {
      return res.status(404).json({ message: 'No restaurants found for this owner.' });
    }

    res.status(200).json(restaurants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch restaurants', message: error.message });
  }
});


router.put('/:restaurantId', verifyRestaurantOwner, async (req, res) => {
  const { restaurantId } = req.params;
  const {
    name,
    description,
    cuisine,
    address,
    contactNumber,
    email,
    operatingHours,
    isActive,
    rating,
    profilePicture,
    coverImage,
  } = req.body;

  try {
    // Ensure the restaurant belongs to the authenticated owner
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    if (restaurant.owner.toString() !== req.ownerId) {
      return res.status(403).json({ error: 'You do not own this restaurant' });
    }

    // Update restaurant details
    restaurant.name = name || restaurant.name;
    restaurant.description = description || restaurant.description;
    restaurant.cuisine = cuisine || restaurant.cuisine;
    restaurant.address = address || restaurant.address;
    restaurant.contactNumber = contactNumber || restaurant.contactNumber;
    restaurant.email = email || restaurant.email;
    restaurant.operatingHours = operatingHours || restaurant.operatingHours;
    restaurant.isActive = isActive !== undefined ? isActive : restaurant.isActive;
    restaurant.rating = rating || restaurant.rating;
    restaurant.profilePicture = profilePicture || restaurant.profilePicture;
    restaurant.coverImage = coverImage || restaurant.coverImage;

    await restaurant.save();
    res.status(200).json(restaurant);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update restaurant', message: err.message });
  }
});

// 2. Delete a restaurant (only by owner)
router.delete('/:restaurantId', verifyRestaurantOwner, async (req, res) => {
  const { restaurantId } = req.params;

  try {
    // Ensure the restaurant belongs to the authenticated owner
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }
    if (restaurant.owner.toString() !== req.ownerId) {
      return res.status(403).json({ error: 'You do not own this restaurant' });
    }

    // Use deleteOne instead of remove
    await Restaurant.deleteOne({ _id: restaurantId });

    res.status(200).json({ message: 'Restaurant deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete restaurant', message: err.message });
  }
});


// 3. Add a new restaurant (already exists in your code)
router.post('/', verifyRestaurantOwner, async (req, res) => {
  const { name, owner, description, cuisine, address, contactNumber, email, operatingHours, isActive, rating, profilePicture, coverImage } = req.body;

  try {
    // Check if the owner is a valid user
    const user = await User.findById(owner);
    if (!user) {
      return res.status(400).json({ error: 'Owner not found' });
    }

    const newRestaurant = new Restaurant({
      name,
      owner,
      description,
      cuisine,
      address,
      contactNumber,
      email,
      operatingHours,
      isActive,
      rating,
      profilePicture,
      coverImage,
    });

    await newRestaurant.save();
    res.status(201).json(newRestaurant);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create restaurant', message: err.message });
  }
});
module.exports = router;
