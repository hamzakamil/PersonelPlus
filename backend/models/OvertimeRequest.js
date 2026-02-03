const mongoose = require('mongoose');

/**
 * Fazla Mesai Talebi
 * Çalışanlar fazla mesai talebinde bulunabilir, yöneticiler onaylayabilir
 */
const overtimeRequestSchema = new mongoose.Schema({
  // Çalışan
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  // Şirket
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  // Talep edilen tarih
  date: {
    type: Date,
    required: true
  },

  // Fazla mesai türü
  overtimeType: {
    type: String,
    enum: ['DAY', 'NIGHT'], // Gündüz (O) veya Gece (G) mesaisi
    required: true
  },

  // Talep edilen saat
  requestedHours: {
    type: Number,
    required: true,
    min: 0.5,
    max: 12
  },

  // Onaylanan saat (onaylayan tarafından değiştirilebilir)
  approvedHours: {
    type: Number,
    default: null,
    min: 0
  },

  // Başlangıç ve bitiş saatleri (opsiyonel)
  startTime: {
    type: String, // "18:00" formatında
    default: null
  },
  endTime: {
    type: String, // "22:00" formatında
    default: null
  },

  // Talep nedeni
  reason: {
    type: String,
    required: true,
    maxLength: 500
  },

  // Durum
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING'
  },

  // Onay bilgileri
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approverComment: {
    type: String,
    default: null
  },

  // Red bilgileri
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },

  // Puantaj'a aktarıldı mı?
  isTransferredToPuantaj: {
    type: Boolean,
    default: false
  },
  transferredAt: {
    type: Date,
    default: null
  },

  // Oluşturan
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
overtimeRequestSchema.index({ employee: 1, date: 1 });
overtimeRequestSchema.index({ company: 1, status: 1 });
overtimeRequestSchema.index({ company: 1, date: 1 });
overtimeRequestSchema.index({ status: 1, date: 1 });

// Virtual: Durum adı
overtimeRequestSchema.virtual('statusName').get(function() {
  const statusNames = {
    'PENDING': 'Onay Bekliyor',
    'APPROVED': 'Onaylandı',
    'REJECTED': 'Reddedildi',
    'CANCELLED': 'İptal Edildi'
  };
  return statusNames[this.status] || this.status;
});

// Virtual: Mesai türü adı
overtimeRequestSchema.virtual('overtimeTypeName').get(function() {
  return this.overtimeType === 'DAY' ? 'Gündüz Mesaisi' : 'Gece Mesaisi';
});

// Virtual: Efektif saat (onaylı ise onaylanan, değilse talep edilen)
overtimeRequestSchema.virtual('effectiveHours').get(function() {
  if (this.status === 'APPROVED' && this.approvedHours !== null) {
    return this.approvedHours;
  }
  return this.requestedHours;
});

// JSON dönüşümünde virtual alanları dahil et
overtimeRequestSchema.set('toJSON', { virtuals: true });
overtimeRequestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('OvertimeRequest', overtimeRequestSchema);
