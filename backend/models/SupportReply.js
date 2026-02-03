const mongoose = require('mongoose');

const supportReplySchema = new mongoose.Schema({
  // İlgili talep
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupportTicket',
    required: true
  },

  // Yanıt veren
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  replierRole: {
    type: String,
    enum: ['super_admin', 'company_admin', 'bayi_admin', 'resmi_muhasebe_ik'],
    required: true
  },

  // Yanıt içeriği
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // Admin tarafından mı?
  isAdminReply: {
    type: Boolean,
    default: false
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
supportReplySchema.index({ ticket: 1, createdAt: 1 });
supportReplySchema.index({ repliedBy: 1 });

module.exports = mongoose.model('SupportReply', supportReplySchema);
