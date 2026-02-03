const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Alıcı
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientType: {
    type: String,
    enum: ['employee', 'company_admin', 'bayi_admin', 'super_admin', 'resmi_muhasebe_ik', 'department_manager', 'hr_manager'],
    required: true
  },

  // Şirket (multi-tenant)
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },

  // Bildirim İçeriği
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  body: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed // Ek veri (deeplink için)
  },

  // Bildirim Tipi
  type: {
    type: String,
    enum: [
      'LEAVE_REQUEST',        // İzin talebi
      'LEAVE_APPROVED',       // İzin onaylandı
      'LEAVE_REJECTED',       // İzin reddedildi
      'ADVANCE_REQUEST',      // Avans talebi
      'ADVANCE_APPROVED',     // Avans onaylandı
      'ADVANCE_REJECTED',     // Avans reddedildi
      'OVERTIME_REQUEST',     // Fazla mesai talebi
      'OVERTIME_APPROVED',    // Fazla mesai onaylandı
      'OVERTIME_REJECTED',    // Fazla mesai reddedildi
      'MESSAGE_RECEIVED',     // Yeni mesaj
      'EMPLOYMENT_STATUS',    // İşe giriş/çıkış durumu
      'EXPENSE_REQUEST',      // Masraf talebi
      'EXPENSE_APPROVED',     // Masraf onaylandı
      'SYSTEM',               // Sistem bildirimi
      'REMINDER',             // Hatırlatma
      'ANNOUNCEMENT'          // Duyuru
    ],
    required: true,
    index: true
  },

  // İlişkili Kayıt
  relatedModel: {
    type: String,
    enum: ['LeaveRequest', 'AdvanceRequest', 'OvertimeRequest', 'Message', 'Employee', 'ExpenseRequest', 'Announcement']
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },

  // Kanal Durumları
  channels: {
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    },
    inApp: {
      sent: { type: Boolean, default: true },
      sentAt: { type: Date, default: Date.now }
    }
  },

  // Okunma Durumu
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,

  // Öncelik
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Compound indexler
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ company: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
