const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: false, // Employee için ilk girişte şifre olmayabilir
    default: null
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    default: null
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  // Google OAuth
  googleId: {
    type: String,
    default: null,
    sparse: true,
    unique: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  mustChangePassword: {
    type: Boolean,
    default: false // İlk girişte şifre değiştirme zorunluluğu
  },

  // Hesap aktivasyonu için token
  activationToken: {
    type: String,
    default: null
  },
  activationTokenExpires: {
    type: Date,
    default: null
  },

  // Şifre sıfırlama için token
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },

  // Bildirim tercihleri
  notificationPreferences: {
    // E-posta ile mesaj bildirimi
    emailOnMessage: {
      type: Boolean,
      default: true
    },
    // E-posta ile işe giriş/çıkış talep güncelleme bildirimi
    emailOnEmploymentUpdate: {
      type: Boolean,
      default: true
    },
    // Uygulama içi bildirimler
    inAppNotifications: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

