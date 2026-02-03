const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  checkInLocation: {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    address: {
      type: String
    }
  },
  checkOutLocation: {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    address: {
      type: String
    }
  },
  status: {
    type: String,
    enum: ['checked_in', 'checked_out', 'auto_checked_in', 'auto_checked_out'],
    default: 'checked_in'
  },
  isAuto: {
    type: Boolean,
    default: false // True if automatically checked in/out based on working hours
  }
}, {
  timestamps: true
});

// Index for efficient queries
checkInSchema.index({ employee: 1, date: 1 });
checkInSchema.index({ company: 1, date: 1 });

module.exports = mongoose.model('CheckIn', checkInSchema);






