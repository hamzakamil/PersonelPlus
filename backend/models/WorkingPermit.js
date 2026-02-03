const mongoose = require('mongoose');

const workingPermitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  parentPermitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkingPermit',
    default: null // Alt kategori için parent referansı
  },
  createdBy: {
    type: String,
    enum: ['super_admin', 'company'],
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  active: {
    type: Boolean,
    default: true
  },
  approvalConfig: {
    // Onay seviyesi sayısı (1 = tek onay, 2+ = çoklu onay)
    levels: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    },
    // Minimum gün sayısı (bu değerin üstündeki talepler çoklu onay gerektirir)
    minDaysForMultiApproval: {
      type: Number,
      default: null // null = her zaman aynı seviye
    },
    // Hangi seviyeler onaylamalı (örn: ['manager', 'dept_manager', 'company_admin'])
    requiredApproverTypes: [{
      type: String,
      enum: ['manager', 'dept_manager', 'company_admin', 'bayi_admin']
    }],
    // Tek onay yeterli mi? (true = zincirdeki herhangi biri, false = sıralı)
    singleApprovalSufficient: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkingPermit', workingPermitSchema);

