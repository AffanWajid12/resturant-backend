const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser); // Only restaurant users can register
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);

module.exports = router;
