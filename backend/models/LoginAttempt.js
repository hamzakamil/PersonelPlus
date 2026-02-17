const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  ip: {
    type: String,
    default: null,
  },
  failedAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
  lastFailedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// TTL index: 1 saat inaktiviteden sonra otomatik temizleme
loginAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 });

// Hesap kilitli mi kontrol et
loginAttemptSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > new Date();
};

// Kalan kilit süresi (saniye)
loginAttemptSchema.methods.getRemainingLockSeconds = function () {
  if (!this.isLocked()) return 0;
  return Math.ceil((this.lockedUntil.getTime() - Date.now()) / 1000);
};

// Rate limit gecikme süresi (ms)
loginAttemptSchema.methods.getRateLimitDelay = function () {
  if (this.failedAttempts === 1) return 2000;  // 2. deneme için 2s
  if (this.failedAttempts === 2) return 4000;  // 3. deneme için 4s
  return 0;
};

// CAPTCHA gerekli mi (4. denemeden itibaren)
loginAttemptSchema.methods.isCaptchaRequired = function () {
  return this.failedAttempts >= 3;
};

// Email ile kayıt bul veya oluştur
loginAttemptSchema.statics.findOrCreateByEmail = async function (email) {
  const normalizedEmail = email.toLowerCase().trim();
  let record = await this.findOne({ email: normalizedEmail });
  if (!record) {
    record = new this({ email: normalizedEmail, failedAttempts: 0 });
    await record.save();
  }
  return record;
};

// Başarısız deneme kaydet
loginAttemptSchema.statics.recordFailure = async function (email, ip) {
  const normalizedEmail = email.toLowerCase().trim();
  let record = await this.findOne({ email: normalizedEmail });

  if (!record) {
    record = new this({ email: normalizedEmail });
  }

  record.failedAttempts += 1;
  record.lastFailedAt = new Date();
  record.ip = ip;

  // 9. denemede 10 dakika kilitle
  if (record.failedAttempts >= 9) {
    record.lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
  }

  await record.save();
  return record;
};

// Başarılı girişte sıfırla
loginAttemptSchema.statics.resetAttempts = async function (email) {
  const normalizedEmail = email.toLowerCase().trim();
  return this.deleteOne({ email: normalizedEmail });
};

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
