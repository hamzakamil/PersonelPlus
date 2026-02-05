const mongoose = require('mongoose');

const bordroSchema = new mongoose.Schema({
  // Referanslar
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
  upload: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BordroUpload',
    required: true
  },
  // Dönem
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
  // Çalışan kimlik bilgisi (Excel'den)
  tcKimlik: {
    type: String,
    required: true
  },
  employeeName: {
    type: String // Excel'deki ad soyad
  },
  // Bordro detayları
  payrollData: {
    // Gün Bilgileri
    eksikGun: { type: String, default: '' }, // "23 Gün 06 Kısmi İstihdam" formatında olabilir
    calismaGunu: { type: Number, default: 0 },
    normalGun: { type: Number, default: 0 },
    izinGunu: { type: Number, default: 0 },

    // Kanun ve Ücret Tipi
    kanun: { type: String, default: '' },
    ucretGunSaat: { type: String, default: '' },

    // Kazançlar
    normalKazanc: { type: Number, default: 0 },
    brutUcret: { type: Number, default: 0 },
    digerKazanc: { type: Number, default: 0 },

    // SGK/SSK
    sskMatrah: { type: Number, default: 0 },
    sskIsveren: { type: Number, default: 0 },
    sgkKesinti: { type: Number, default: 0 },
    issizlikPrimi: { type: Number, default: 0 }, // İşsizlik Sigortası İşçi Payı

    // Gelir Vergisi
    gvMatrah: { type: Number, default: 0 },
    toplamGvMatrah: { type: Number, default: 0 },
    gelirVergisi: { type: Number, default: 0 },
    kalanGelirVergisi: { type: Number, default: 0 },

    // Kesintiler
    damgaVergisi: { type: Number, default: 0 },
    ozelKesinti: { type: Number, default: 0 },

    // Net Ödeme
    netOdenen: { type: Number, default: 0 },

    // Mesai - Süre ve Tutar
    fazlaMesaiSaat: { type: String, default: '' },
    fazlaMesaiTutar: { type: Number, default: 0 },
    geceMesaisiSaat: { type: String, default: '' },
    geceMesaisiTutar: { type: Number, default: 0 },

    // Excel'deki tüm ham veri
    rawData: mongoose.Schema.Types.Mixed
  },
  // Durum
  // pending: Bayi yükledi, şirket onayı bekliyor
  // company_approved: Şirket onayladı, çalışan onayı bekliyor
  // approved: Çalışan da onayladı (final)
  // rejected: Çalışan reddetti (itiraz)
  status: {
    type: String,
    enum: ['pending', 'company_approved', 'approved', 'rejected'],
    default: 'pending'
  },

  // Şirket onay bilgileri
  companyApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  companyApprovedAt: Date,
  companyApprovalNote: String,

  // Çalışan onay bilgileri
  employeeApprovalCode: String, // SHA256 hash olarak saklanacak
  employeeApprovalCodeExpires: Date,
  employeeApprovalCodeAttempts: {
    type: Number,
    default: 0
  },
  employeeApprovalCodeLastRequest: Date, // Rate limiting için
  employeeApprovedAt: Date,
  employeeApprovedIp: String,

  // Red bilgileri (çalışan itirazı)
  rejectedAt: Date,
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  rejectionNotifiedToDealer: {
    type: Boolean,
    default: false
  },

  // Çalışan görüntüleme takibi
  firstViewedAt: Date,
  lastViewedAt: Date,
  viewCount: {
    type: Number,
    default: 0
  },

  // Zaman Damgası Bilgileri (RFC 3161)
  timestampedPdfPath: {
    type: String  // Zaman damgalı PDF dosya yolu
  },
  timestampToken: {
    raw: Buffer,           // Ham TimeStampToken (DER encoded)
    genTime: Date,         // Zaman damgası zamanı
    serialNumber: String,  // TSA seri numarası
    policy: String,        // Policy OID
    hashAlgorithm: {
      type: String,
      default: 'SHA-256'
    },
    messageImprint: String,  // Orijinal PDF hash (hex)
    tsaName: String          // TSA sunucu adı
  },
  timestampedAt: Date,  // İşlem zamanı
  timestampVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Unique constraint: Aynı çalışan için aynı ay/yıl tek bordro
bordroSchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });
bordroSchema.index({ company: 1, year: 1, month: 1 });
bordroSchema.index({ tcKimlik: 1, company: 1, year: 1, month: 1 });
bordroSchema.index({ status: 1, notifiedAt: 1 });
bordroSchema.index({ upload: 1 });

// Görüntüleme kaydı metodu (şirket onaylı veya tam onaylı bordrolar için)
bordroSchema.methods.recordView = function() {
  if (!['company_approved', 'approved'].includes(this.status)) {
    return Promise.resolve(this); // Henüz onaylanmamış bordro görüntülenemez
  }

  if (!this.firstViewedAt) {
    this.firstViewedAt = new Date();
  }
  this.lastViewedAt = new Date();
  this.viewCount = (this.viewCount || 0) + 1;

  return this.save();
};

module.exports = mongoose.model('Bordro', bordroSchema);
