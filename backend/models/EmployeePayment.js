const mongoose = require('mongoose');

const employeePaymentSchema = new mongoose.Schema({
  // Çalışan referansı
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  // Şirket referansı
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // Şirket ödeme türü referansı
  companyPaymentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyPaymentType',
    required: true
  },

  // Tutar (null = şirket varsayılanını kullan)
  amount: {
    type: Number,
    default: null,
    min: 0
  },

  // Dönem bilgileri
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    default: null // null = süresiz devam
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Tek seferlik ödemeler için
  paymentDate: {
    type: Date,
    default: null // Planlanan ödeme tarihi
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  paidDate: {
    type: Date,
    default: null
  },

  // Onay durumu
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'],
    default: 'APPROVED' // Aylık ödemeler otomatik onaylı
  },

  // Onay zinciri (tek seferlik ödemeler için)
  approvalChain: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    actionDate: {
      type: Date,
      default: null
    },
    comment: {
      type: String,
      default: null
    }
  }],

  // Notlar
  notes: {
    type: String,
    default: null
  },

  // Oluşturan ve onaylayan
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
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
  }
}, {
  timestamps: true
});

// Indexes
employeePaymentSchema.index({ employee: 1, companyPaymentType: 1, isActive: 1 });
employeePaymentSchema.index({ company: 1, status: 1 });
employeePaymentSchema.index({ employee: 1, status: 1 });
employeePaymentSchema.index({ paymentDate: 1, isPaid: 1 });

// Efektif tutarı döndür (kendi tutarı veya şirket varsayılanı)
employeePaymentSchema.virtual('effectiveAmount').get(function() {
  if (this.amount !== null && this.amount !== undefined) {
    return this.amount;
  }
  if (this.companyPaymentType && typeof this.companyPaymentType === 'object') {
    return this.companyPaymentType.defaultAmount;
  }
  return 0;
});

// Durum Türkçe adı
employeePaymentSchema.virtual('statusName').get(function() {
  const statusNames = {
    'PENDING': 'Onay Bekliyor',
    'APPROVED': 'Onaylandı',
    'REJECTED': 'Reddedildi',
    'PAID': 'Ödendi',
    'CANCELLED': 'İptal Edildi'
  };
  return statusNames[this.status] || this.status;
});

// JSON dönüşümünde virtual alanları dahil et
employeePaymentSchema.set('toJSON', { virtuals: true });
employeePaymentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmployeePayment', employeePaymentSchema);
