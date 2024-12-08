const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum:['Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['Order', 'Restaurant', 'User', 'Payment']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Automatically set expiration for notifications
NotificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Set expiration to 30 days from creation
    this.expiresAt = new Date(this.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports=  mongoose.model('Notification', NotificationSchema);