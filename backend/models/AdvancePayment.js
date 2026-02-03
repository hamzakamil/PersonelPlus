const mongoose = require('mongoose');

const advancePaymentSchema = new mongoose.Schema({
  advanceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdvanceRequest',
    required: true
  },
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
  month: {
    type: String, // "2026-02" formatında
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paid: {
    type: Boolean,
    default: false
  },
  paidDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['SALARY_DEDUCTION', 'CASH', 'BANK_TRANSFER', 'OTHER'],
    default: 'SALARY_DEDUCTION'
  },
  paymentNote: {
    type: String
  },
  // Maaş bordrosu entegrasyonu için
  salaryRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Salary' // Gelecekte maaş sistemi eklendiğinde
  },
  // İşlemi yapan
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
advancePaymentSchema.index({ advanceRequest: 1, month: 1 });
advancePaymentSchema.index({ employee: 1, month: 1 });
advancePaymentSchema.index({ company: 1, paid: 1 });
advancePaymentSchema.index({ paid: 1, paidDate: -1 });

module.exports = mongoose.model('AdvancePayment', advancePaymentSchema);
