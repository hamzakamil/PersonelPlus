const mongoose = require('mongoose');

const leaveLedgerSchema = new mongoose.Schema({
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
  year: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['CARRYOVER', 'ENTITLEMENT', 'USED', 'REVERSAL', 'ADJUSTMENT'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  credit: {
    type: Number,
    default: 0 // Alacak - hak edilen gün
  },
  debit: {
    type: Number,
    default: 0 // Borç - kullanılan gün
  },
  balance: {
    type: Number,
    default: 0 // Running balance - hesaplanacak
  },
  leaveRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveRequest',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  note: {
    type: String,
    default: ''
  },
  isSystemGenerated: {
    type: Boolean,
    default: false
  },
  // Soft Delete Alanları
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deleteReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
leaveLedgerSchema.index({ employee: 1, year: 1, date: 1 });
leaveLedgerSchema.index({ company: 1, year: 1 });
leaveLedgerSchema.index({ leaveRequest: 1 });
leaveLedgerSchema.index({ company: 1, isDeleted: 1 });

module.exports = mongoose.model('LeaveLedger', leaveLedgerSchema);
