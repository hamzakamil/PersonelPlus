const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Mesaj tipi
  type: {
    type: String,
    enum: ['EMPLOYMENT_REQUEST', 'GENERAL', 'SYSTEM'],
    default: 'EMPLOYMENT_REQUEST'
  },

  // İlgili talep (işe giriş/çıkış talebi)
  relatedRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmploymentPreRecord',
    default: null
  },

  // Gönderen
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['bayi_admin', 'resmi_muhasebe_ik', 'company_admin', 'super_admin'],
    required: true
  },

  // Alıcı şirket (şirket adminlerine gidecek mesajlar için)
  recipientCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },

  // Alıcı bayi (bayiye gidecek mesajlar için)
  recipientDealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    default: null
  },

  // Alıcı çalışan (bireysel mesajlar için)
  recipientEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },

  // Mesaj içeriği
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // Okunma durumu
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Yanıt zinciri (thread)
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ recipientCompany: 1, isRead: 1, createdAt: -1 });
messageSchema.index({ recipientDealer: 1, isRead: 1, createdAt: -1 });
messageSchema.index({ recipientEmployee: 1, isRead: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ relatedRequest: 1, createdAt: -1 });
messageSchema.index({ parentMessage: 1 });

module.exports = mongoose.model('Message', messageSchema);
