const mongoose = require('mongoose');

/**
 * Zaman Damgası Log Modeli
 * RFC 3161 işlemlerinin takibi için
 */
const timestampLogSchema = new mongoose.Schema({
  // İlişkiler
  bordro: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bordro',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  // İşlem tipi
  action: {
    type: String,
    enum: ['request', 'success', 'failure', 'verify', 'retry'],
    required: true
  },

  // TSA bilgileri
  tsaUrl: {
    type: String,
    required: true
  },
  tsaName: String,  // 'FreeTSA', 'TÜBİTAK Kamu SM' vb.

  // İstek bilgileri
  requestHash: String,  // Gönderilen hash (hex)
  hashAlgorithm: {
    type: String,
    default: 'SHA-256'
  },
  nonce: String,  // İstek nonce değeri

  // Yanıt bilgileri
  responseStatus: Number,  // HTTP status veya TSA status
  responseStatusInfo: String,  // TSA durum mesajı
  serialNumber: String,  // TSA seri numarası
  genTime: Date,  // Zaman damgası zamanı

  // Hata bilgileri
  errorCode: String,
  errorMessage: String,

  // Performans
  duration: {
    type: Number,  // ms cinsinden süre
    default: 0
  },
  retryCount: {
    type: Number,
    default: 0
  },

  // IP ve cihaz bilgisi
  clientIp: String,
  userAgent: String

}, {
  timestamps: true
});

// İndeksler
timestampLogSchema.index({ bordro: 1 });
timestampLogSchema.index({ employee: 1, createdAt: -1 });
timestampLogSchema.index({ company: 1, createdAt: -1 });
timestampLogSchema.index({ action: 1, createdAt: -1 });
timestampLogSchema.index({ createdAt: -1 });

// Static method: Bordro için log oluştur
timestampLogSchema.statics.logRequest = async function(bordro, tsaUrl, requestHash) {
  return this.create({
    bordro: bordro._id,
    employee: bordro.employee,
    company: bordro.company,
    action: 'request',
    tsaUrl,
    requestHash,
    hashAlgorithm: 'SHA-256'
  });
};

// Static method: Başarılı yanıt logla
timestampLogSchema.statics.logSuccess = async function(bordro, tsaUrl, responseData, duration) {
  return this.create({
    bordro: bordro._id,
    employee: bordro.employee,
    company: bordro.company,
    action: 'success',
    tsaUrl,
    requestHash: responseData.messageImprint,
    responseStatus: 0,  // PKIStatus.GRANTED
    serialNumber: responseData.serialNumber,
    genTime: responseData.genTime,
    duration
  });
};

// Static method: Hata logla
timestampLogSchema.statics.logFailure = async function(bordro, tsaUrl, error, duration) {
  return this.create({
    bordro: bordro._id,
    employee: bordro.employee,
    company: bordro.company,
    action: 'failure',
    tsaUrl,
    errorCode: error.code || 'UNKNOWN',
    errorMessage: error.message,
    duration
  });
};

// Static method: Doğrulama logla
timestampLogSchema.statics.logVerify = async function(bordro, tsaUrl, verified) {
  return this.create({
    bordro: bordro._id,
    employee: bordro.employee,
    company: bordro.company,
    action: 'verify',
    tsaUrl,
    responseStatus: verified ? 0 : 1,
    responseStatusInfo: verified ? 'Verified' : 'Verification Failed'
  });
};

module.exports = mongoose.model('TimestampLog', timestampLogSchema);
