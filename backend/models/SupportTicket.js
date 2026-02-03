const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  // Talep sahibi
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submitterRole: {
    type: String,
    enum: ['company_admin', 'bayi_admin', 'resmi_muhasebe_ik'],
    required: true
  },

  // Şirket/Bayi bilgisi
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    default: null
  },

  // Talep detayları
  category: {
    type: String,
    enum: ['ISSUE', 'REQUEST', 'SUGGESTION', 'QUESTION'],
    required: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // Durum
  status: {
    type: String,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN'
  },

  // Admin tarafı
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  adminNotes: {
    type: String,
    maxlength: 1000,
    default: null
  },

  // Zaman takibi
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
supportTicketSchema.index({ submittedBy: 1, createdAt: -1 });
supportTicketSchema.index({ company: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ dealer: 1, status: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
