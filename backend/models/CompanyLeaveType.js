const mongoose = require('mongoose');

/**
 * Şirket bazlı izin türleri
 * Global LeaveType'lardan kopyalanır veya şirket özel olarak eklenir
 */
const companyLeaveTypeSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    default: null // Global LeaveType referansı (varsa)
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true // Şirket için aktif mi?
  },
  customDays: {
    type: Number,
    default: null // Şirket özel gün sayısı (null ise LeaveType.defaultDays kullanılır)
  },
  isDefault: {
    type: Boolean,
    default: false // Global default'tan mı geldi? (silinemez/değiştirilemez)
  },
  isOtherCategory: {
    type: Boolean,
    default: false // "Diğer" kategorisi mi?
  },
  createdByBayiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    default: null // Bayi admin tarafından oluşturulduysa bayi ID'si
  }
}, {
  timestamps: true
});

// Index
companyLeaveTypeSchema.index({ company: 1, isActive: 1 });
companyLeaveTypeSchema.index({ company: 1, leaveType: 1 });

module.exports = mongoose.model('CompanyLeaveType', companyLeaveTypeSchema);

