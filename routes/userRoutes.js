// routes/userRoutes.js
const express = require('express');
const User = require('../models/userModel');
const router = express.Router();

// Create a new user
router.post('/', async (req, res) => {
  const { username, email, password, role, profilePicture, contactNumber, address } = req.body;

  try {
    const newUser = new User({
      username,
      email,
      password,
      role,
      profilePicture,
      contactNumber,
      address
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user', message: err.message });
  }
});

// Get all users (for testing purposes)
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users', message: err.message });
  }
});

module.exports = router;
