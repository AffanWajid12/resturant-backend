const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  customizations: [{
    name: String,
    selectedOptions: [String]
  }],
  itemTotal: {
    type: Number,
    required: true
  }
});

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  items: [CartItemSchema],
  totalPrice: {
    type: Number,
    default: 0
  },
  appliedDiscount: {
    type: Number,
    default: 0
  },
  finalTotal: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Middleware to calculate totals
CartSchema.pre('save', function(next) {
  this.totalPrice = this.items.reduce((total, item) => total + item.itemTotal, 0);
  this.finalTotal = this.totalPrice - this.appliedDiscount;
  next();
});

module.exports=  mongoose.model('Cart', CartSchema);