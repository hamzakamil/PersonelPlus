const mongoose = require('mongoose');

const employmentSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  workplaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workplace',
    required: true
  },
  hireDate: {
    type: Date,
    default: null
  },
  terminationDate: {
    type: Date,
    default: null
  },
  terminationReason: {
    type: String,
    enum: ['istifa', 'işten çıkarma', null],
    default: null
  },
  sgkProfessionCode: {
    type: String,
    default: null
  },
  salaryType: {
    type: String,
    enum: ['net', 'brüt'],
    required: true
  },
  salaryAmount: {
    type: Number,
    required: true
  },
  payrollType: {
    type: String,
    enum: ['NET', 'BRUT'],
    required: true // Şirket ayarından alınır
  },
  contractType: {
    type: String,
    enum: ['BELİRSİZ_SÜRELİ', 'BELİRLİ_SÜRELİ', 'KISMİ_SÜRELİ'],
    default: 'BELİRSİZ_SÜRELİ'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documents: [{
    type: {
      type: String,
      enum: ['sözleşme', 'istifa_dilekçesi', 'ihbar_kıdem_hesap'],
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['PENDING_COMPANY_APPROVAL', 'APPROVED', 'CANCELLED', 'CANCELLATION_PENDING', 'aktif', 'pasif'],
    default: 'PENDING_COMPANY_APPROVAL'
  },
  pendingDate: {
    type: Date,
    default: Date.now // Onaya gönderilme tarihi
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  cancellationRequest: {
    reason: {
      type: String,
      default: null
    },
    requestedAt: {
      type: Date,
      default: null
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approvedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isApproved: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes
employmentSchema.index({ employeeId: 1, status: 1 });
employmentSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('Employment', employmentSchema);

