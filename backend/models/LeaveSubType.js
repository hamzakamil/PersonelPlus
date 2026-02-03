const mongoose = require('mongoose');

/**
 * Alt izin türleri (LeaveSubTypes)
 * "Diğer" kategorisi altında gösterilir
 */
const leaveSubTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  parentLeaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyLeaveType',
    required: true // Ana kategoriye referans
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  code: {
    type: String,
    unique: true,
    sparse: true
  },
  defaultDays: {
    type: Number,
    default: 0 // İş Kanunu varsayılan gün sayısı
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false // Global default'tan mı geldi?
  },
  createdByBayiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    default: null // Bayi admin tarafından oluşturulduysa bayi ID'si
  }
}, {
  timestamps: true
});

// Her ana kategori altında aynı isimde alt kategori olamaz
leaveSubTypeSchema.index({ parentLeaveType: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('LeaveSubType', leaveSubTypeSchema);

