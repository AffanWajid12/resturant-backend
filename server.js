const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const orderRoutes = require('./routes/orderRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes')
const userRoutes = require('./routes/userRoutes');
const restaurantRoutes = require('./routes/resturantRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes')

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
console.log(process.env.ORIGIN)
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/orders', orderRoutes);
app.use('/api', menuItemRoutes);
app.use('/api', analyticsRoutes);
app.use('/api/users', userRoutes);//This is for testing purpose
app.use('/api/restaurants', restaurantRoutes);

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});