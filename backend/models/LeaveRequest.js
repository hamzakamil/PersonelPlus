const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
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
  companyLeaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkingPermit', // Yeni model yapısı
    required: true
  },
  leaveSubType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkingPermit', // Yeni model yapısı
    default: null // "Diğer izinler" kategorisi seçildiğinde alt izin türü
  },
  type: {
    type: String,
    required: true // İzin tipi (yıllık izin, mazeret izni, vb.) - backward compatibility
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date // İş başı tarihi
  },
  startTime: {
    type: String // Format: "HH:mm" - for half day or hourly leave
  },
  endTime: {
    type: String // Format: "HH:mm" - for half day or hourly leave
  },
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDayPeriod: {
    type: String,
    enum: ['morning', 'afternoon'],
    default: null
  },
  isHourly: {
    type: Boolean,
    default: false
  },
  hours: {
    type: Number,
    default: 0
  },
  totalDays: {
    type: Number,
    required: true
  },
  calculatedDays: {
    type: Number,
    default: 0
  },
  description: {
    type: String
  },
  document: {
    type: String // File path for report leave
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'SUSPENDED'],
    default: 'PENDING'
  },
  currentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // Sıradaki onaylayıcı (approvalChain'den)
  },
  history: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null // Employee kaydı olmayan admin'ler için null olabilir
    },
    approverUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // Onaylayan kullanıcının User ID'si (admin'ler için)
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'SUSPENDED'],
      required: true
    },
    note: {
      type: String
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  rejectReason: {
    type: String,
    default: null // Red nedeni (nullable)
  },
  // İptal Talebi Alanları
  cancellationReason: {
    type: String,
    default: null // İptal nedeni
  },
  cancellationRequestedAt: {
    type: Date,
    default: null // İptal talep tarihi
  },
  cancellationRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // İptal talep eden çalışan
  },
  cancellationCurrentApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // İptal onayı bekleyen onaylayıcı
  },
  cancellationHistory: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    approverUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      required: true
    },
    note: {
      type: String
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  cancellationApprovedAt: {
    type: Date,
    default: null
  },
  cancellationApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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
  createdByAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Admin tarafından oluşturulduysa User ID
  },
  isAdminCreated: {
    type: Boolean,
    default: false // Admin tarafından oluşturuldu mu?
  },
  // Soft Delete Alanları
  isDeleted: {
    type: Boolean,
    default: false // Silinmiş mi?
  },
  deletedAt: {
    type: Date,
    default: null // Silinme tarihi
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Silen kullanıcı
  },
  deleteReason: {
    type: String,
    default: null // Silme nedeni
  }
}, {
  timestamps: true
});

// Indexes
leaveRequestSchema.index({ employee: 1, startDate: -1 });
leaveRequestSchema.index({ company: 1, status: 1 });
leaveRequestSchema.index({ company: 1, startDate: 1, endDate: 1 });
leaveRequestSchema.index({ company: 1, isDeleted: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);

