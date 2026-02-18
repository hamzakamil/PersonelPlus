/**
 * SMS Doğrulama Modeli
 * Hukuki delil niteliği taşıyan SMS doğrulama kayıtları
 */

const mongoose = require('mongoose');

const smsVerificationSchema = new mongoose.Schema(
  {
    // Doğrulama türü
    type: {
      type: String,
      enum: ['BORDRO_APPROVAL', 'LEAVE_ACCEPTANCE', 'EMPLOYEE_ACTIVATION'],
      required: true,
      index: true,
    },

    // Telefon numarası (05XXXXXXXXX formatında)
    phone: {
      type: String,
      required: true,
      index: true,
    },

    // OTP kodu (SHA256 hash olarak saklanır)
    codeHash: {
      type: String,
      required: true,
    },

    // Kod geçerlilik süresi
    codeExpires: {
      type: Date,
      required: true,
    },

    // Deneme sayısı
    attempts: {
      type: Number,
      default: 0,
    },

    // Son kod istek zamanı (rate limiting için)
    lastCodeRequestAt: {
      type: Date,
      default: null,
    },

    // Doğrulama durumu
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'EXPIRED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },

    // Verimor SMS bilgileri
    campaignId: {
      type: String,
      default: null,
    },

    customId: {
      type: String,
      default: null,
    },

    // SMS teslim durumu
    deliveryStatus: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'EXPIRED', 'REJECTED', 'NOT_DELIVERED'],
      default: 'PENDING',
    },

    deliveryTime: {
      type: Date,
      default: null,
    },

    // SMS gönderim zamanı
    sentAt: {
      type: Date,
      default: null,
    },

    // Gönderilen mesaj içeriği (hukuki delil için)
    messageContent: {
      type: String,
      required: true,
    },

    // Doğrulama bilgileri
    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedIp: {
      type: String,
      default: null,
    },

    // İlişkili kayıt
    relatedModel: {
      type: String,
      enum: ['Bordro', 'LeaveRequest', 'Employee'],
      required: true,
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'relatedModel',
    },

    // Çalışan ve şirket bilgileri
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    // RFC 3161 Zaman Damgası (doğrulama anında)
    timestampToken: {
      // Ham token (DER encoded)
      raw: {
        type: Buffer,
        default: null,
      },
      // Zaman damgası üretim zamanı
      genTime: {
        type: Date,
        default: null,
      },
      // TSA seri numarası
      serialNumber: {
        type: String,
        default: null,
      },
      // Hash algoritması
      hashAlgorithm: {
        type: String,
        default: 'SHA-256',
      },
      // Mesaj özeti (hex)
      messageImprint: {
        type: String,
        default: null,
      },
      // TSA adı
      tsaName: {
        type: String,
        default: null,
      },
    },

    timestampedAt: {
      type: Date,
      default: null,
    },

    // Hata bilgileri
    errorMessage: {
      type: String,
      default: null,
    },

    errorCode: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// İndeksler
smsVerificationSchema.index({ relatedModel: 1, relatedId: 1 });
smsVerificationSchema.index({ employee: 1, type: 1, createdAt: -1 });
smsVerificationSchema.index({ company: 1, type: 1, createdAt: -1 });
smsVerificationSchema.index({ codeExpires: 1 }, { expireAfterSeconds: 86400 }); // 24 saat sonra temizle

// Sanal alanlar
smsVerificationSchema.virtual('isExpired').get(function () {
  return new Date() > this.codeExpires;
});

smsVerificationSchema.virtual('remainingAttempts').get(function () {
  const maxAttempts = 3;
  return Math.max(0, maxAttempts - this.attempts);
});

smsVerificationSchema.virtual('maskedPhone').get(function () {
  if (!this.phone) return null;
  // 05XX XXX XX67 formatında maskele
  const phone = this.phone.replace(/\D/g, '');
  if (phone.length < 10) return this.phone;
  return `${phone.slice(0, 2)}XX XXX XX${phone.slice(-2)}`;
});

// Statik metodlar
smsVerificationSchema.statics.findActiveByRelated = function (relatedModel, relatedId) {
  return this.findOne({
    relatedModel,
    relatedId,
    status: 'PENDING',
    codeExpires: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

smsVerificationSchema.statics.findVerifiedByRelated = function (relatedModel, relatedId) {
  return this.findOne({
    relatedModel,
    relatedId,
    status: 'VERIFIED',
  }).sort({ verifiedAt: -1 });
};

// Instance metodlar
smsVerificationSchema.methods.incrementAttempts = async function () {
  this.attempts += 1;
  if (this.attempts >= 3) {
    this.status = 'FAILED';
  }
  return this.save();
};

smsVerificationSchema.methods.markAsVerified = async function (ip, timestampToken = null) {
  this.status = 'VERIFIED';
  this.verifiedAt = new Date();
  this.verifiedIp = ip;

  if (timestampToken) {
    this.timestampToken = timestampToken;
    this.timestampedAt = new Date();
  }

  return this.save();
};

smsVerificationSchema.methods.markAsExpired = async function () {
  this.status = 'EXPIRED';
  return this.save();
};

smsVerificationSchema.methods.updateDeliveryStatus = async function (status, deliveryTime = null) {
  this.deliveryStatus = status;
  if (deliveryTime) {
    this.deliveryTime = deliveryTime;
  }
  return this.save();
};

// JSON dönüşümünde hassas verileri gizle
smsVerificationSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.codeHash;
    delete ret.timestampToken?.raw;
    return ret;
  },
});

module.exports = mongoose.model('SmsVerification', smsVerificationSchema);
