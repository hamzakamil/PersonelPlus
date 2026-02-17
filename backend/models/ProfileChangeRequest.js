const mongoose = require('mongoose');

const profileChangeRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // Değişiklik detayları: { alan: { old: eskiDeger, new: yeniDeger } }
  changes: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewNote: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

profileChangeRequestSchema.index({ company: 1, status: 1, createdAt: -1 });
profileChangeRequestSchema.index({ employee: 1, status: 1 });

module.exports = mongoose.model('ProfileChangeRequest', profileChangeRequestSchema);
