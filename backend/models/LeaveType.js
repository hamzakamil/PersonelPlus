const mongoose = require('mongoose');

/**
 * Global izin türleri (sistem genelinde)
 * IsDefault=true olanlar yeni şirketlere otomatik eklenir
 */
const leaveTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  isDefault: {
    type: Boolean,
    default: false // true ise yeni şirketlere otomatik eklenir
  },
  code: {
    type: String,
    unique: true,
    sparse: true // Sadece dolu olanlar unique
  },
  attendanceCode: {
    type: String,
    maxlength: 2, // Puantaj harfi (S, R, H, N, vb.)
    uppercase: true,
    trim: true
  },
  defaultDays: {
    type: Number,
    default: 0 // İş Kanunu varsayılan gün sayısı
  },
  isOtherCategory: {
    type: Boolean,
    default: false // "Diğer" kategorisi mi? (alt izinler için)
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index
leaveTypeSchema.index({ isDefault: 1, isActive: 1 });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);




