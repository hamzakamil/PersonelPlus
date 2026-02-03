const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  // Kullanıcı
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Cihaz Token
  token: {
    type: String,
    required: true,
    unique: true
  },

  // Platform
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },

  // Cihaz Bilgileri
  deviceId: {
    type: String // Unique device identifier
  },
  deviceName: {
    type: String // "iPhone 15 Pro", "Samsung S24"
  },
  appVersion: {
    type: String // "1.0.0"
  },
  osVersion: {
    type: String // "iOS 17.2", "Android 14"
  },

  // Push Servisi Sağlayıcısı
  provider: {
    type: String,
    enum: ['fcm', 'apns', 'web-push'], // Firebase, Apple, Web Push
    required: true
  },

  // Durum
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  },

  // Hata Takibi
  failureCount: {
    type: Number,
    default: 0
  },
  lastError: {
    type: String
  },
  lastErrorAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexler
deviceTokenSchema.index({ user: 1, isActive: 1 });
deviceTokenSchema.index({ token: 1 }, { unique: true });

// TTL index: 90 gün kullanılmayan token'ları otomatik sil
deviceTokenSchema.index(
  { lastUsedAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 gün
);

// 3 başarısız denemeden sonra token'ı deaktive et
deviceTokenSchema.methods.recordFailure = async function(error) {
  this.failureCount += 1;
  this.lastError = error;
  this.lastErrorAt = new Date();

  if (this.failureCount >= 3) {
    this.isActive = false;
  }

  await this.save();
};

// Başarılı gönderimde failure count'u sıfırla
deviceTokenSchema.methods.recordSuccess = async function() {
  this.failureCount = 0;
  this.lastError = null;
  this.lastErrorAt = null;
  this.lastUsedAt = new Date();
  await this.save();
};

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
