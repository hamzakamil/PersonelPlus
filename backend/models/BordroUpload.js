const mongoose = require('mongoose');

const bordroUploadSchema = new mongoose.Schema({
  // Şirket referansı
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  // Yükleyen bayi
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true
  },
  // Yükleyen kullanıcı
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Dönem bilgisi
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  // Dosya bilgileri
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  // Excel'den okunan şirket metadata'sı (ilk 9 satır)
  companyMetadata: {
    companyName: String,
    taxNumber: String,
    sgkNumber: String,
    address: String,
    period: String,
    rawData: mongoose.Schema.Types.Mixed // Tüm metadata satırları
  },
  // İşlem durumu
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
    default: 'pending'
  },
  // İstatistikler
  stats: {
    totalRows: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    notifiedCount: { type: Number, default: 0 }
  },
  // Hata listesi
  errors: [{
    row: Number,
    tcKimlik: String,
    employeeName: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // Zaman damgaları
  processedAt: Date,
  notificationsSentAt: Date
}, {
  timestamps: true
});

// Indexler
bordroUploadSchema.index({ company: 1, year: 1, month: 1 });
bordroUploadSchema.index({ dealer: 1, createdAt: -1 });
bordroUploadSchema.index({ status: 1 });

module.exports = mongoose.model('BordroUpload', bordroUploadSchema);
