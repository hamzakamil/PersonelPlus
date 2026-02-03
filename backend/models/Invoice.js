const mongoose = require('mongoose');

/**
 * UBL-TR Uyumlu e-Fatura Modeli
 * GİB e-Fatura Portal Entegratörleri ile Uyumlu
 * (Foriba, Logo, Paraşüt, vb.)
 */

// Fatura Kalemi Alt Şeması
const invoiceLineSchema = new mongoose.Schema({
  lineId: { type: String, required: true }, // Satır numarası

  // Ürün/Hizmet Bilgileri
  item: {
    name: { type: String, required: true },
    description: String,
    sellersItemIdentification: String, // Satıcı ürün kodu
    buyersItemIdentification: String   // Alıcı ürün kodu
  },

  // Miktar
  quantity: {
    value: { type: Number, required: true },
    unitCode: { type: String, default: 'C62' } // C62 = Adet, KGM = Kilogram, MTR = Metre
  },

  // Birim Fiyat
  price: {
    priceAmount: { type: Number, required: true },
    currencyId: { type: String, default: 'TRY' }
  },

  // Satır Tutarları
  lineExtensionAmount: { type: Number, required: true }, // KDV hariç tutar

  // KDV Bilgileri
  taxTotal: {
    taxAmount: { type: Number, default: 0 },
    taxSubtotal: [{
      taxableAmount: Number,
      taxAmount: Number,
      percent: Number,
      taxCategory: {
        taxScheme: {
          name: { type: String, default: 'KDV' },
          taxTypeCode: { type: String, default: '0015' } // 0015 = KDV
        }
      }
    }]
  },

  // İndirim/Artırım
  allowanceCharge: [{
    chargeIndicator: Boolean, // true = artırım, false = indirim
    multiplierFactorNumeric: Number, // yüzde
    amount: Number,
    baseAmount: Number,
    reason: String
  }]
}, { _id: false });

// Ana Fatura Şeması
const invoiceSchema = new mongoose.Schema({
  // === UBL-TR Zorunlu Alanlar ===

  // Benzersiz Fatura Kimliği (UUID formatında)
  uuid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Fatura Numarası (GİB formatı: ABC2024000000001)
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Fatura Tipi
  invoiceTypeCode: {
    type: String,
    enum: ['SATIS', 'IADE', 'TEVKIFAT', 'ISTISNA', 'OZELMATRAH', 'IHRACKAYITLI'],
    default: 'SATIS'
  },

  // Profil ID (Senaryo)
  profileId: {
    type: String,
    enum: ['TICARIFATURA', 'EARSIVFATURA', 'IHRACAT', 'YOLCUBERABERI'],
    default: 'TICARIFATURA'
  },

  // Tarih/Saat
  issueDate: { type: Date, required: true },
  issueTime: { type: String }, // HH:mm:ss formatı

  // Para Birimi
  documentCurrencyCode: { type: String, default: 'TRY' },

  // === Taraflar ===

  // Satıcı (Tedarikçi) Bilgileri
  accountingSupplierParty: {
    party: {
      partyIdentification: {
        schemeId: { type: String, default: 'VKN' }, // VKN veya TCKN
        id: { type: String, required: true } // Vergi/TC Kimlik No
      },
      partyName: { type: String, required: true },
      postalAddress: {
        streetName: String,
        buildingNumber: String,
        citySubdivisionName: String, // İlçe
        cityName: String, // İl
        postalZone: String, // Posta Kodu
        country: {
          identificationCode: { type: String, default: 'TR' },
          name: { type: String, default: 'Türkiye' }
        }
      },
      partyTaxScheme: {
        taxScheme: {
          name: String // Vergi Dairesi
        }
      },
      contact: {
        telephone: String,
        electronicMail: String
      }
    }
  },

  // Alıcı (Müşteri) Bilgileri
  accountingCustomerParty: {
    party: {
      partyIdentification: {
        schemeId: { type: String, default: 'VKN' },
        id: { type: String, required: true }
      },
      partyName: { type: String, required: true },
      postalAddress: {
        streetName: String,
        buildingNumber: String,
        citySubdivisionName: String,
        cityName: String,
        postalZone: String,
        country: {
          identificationCode: { type: String, default: 'TR' },
          name: { type: String, default: 'Türkiye' }
        }
      },
      partyTaxScheme: {
        taxScheme: {
          name: String
        }
      },
      contact: {
        telephone: String,
        electronicMail: String
      }
    }
  },

  // === Fatura Kalemleri ===
  invoiceLines: [invoiceLineSchema],

  // === Toplam Tutarlar ===

  // Vergi Toplamı
  taxTotal: {
    taxAmount: { type: Number, default: 0 },
    taxSubtotal: [{
      taxableAmount: Number,
      taxAmount: Number,
      percent: Number,
      taxCategory: {
        taxScheme: {
          name: { type: String, default: 'KDV' },
          taxTypeCode: { type: String, default: '0015' }
        }
      }
    }]
  },

  // Parasal Toplamlar
  legalMonetaryTotal: {
    lineExtensionAmount: { type: Number, required: true }, // Mal/Hizmet toplam tutarı (KDV hariç)
    taxExclusiveAmount: { type: Number, required: true },  // Vergiler hariç toplam
    taxInclusiveAmount: { type: Number, required: true },  // Vergiler dahil toplam
    allowanceTotalAmount: { type: Number, default: 0 },    // Toplam indirim
    chargeTotalAmount: { type: Number, default: 0 },       // Toplam artırım
    payableAmount: { type: Number, required: true }        // Ödenecek tutar
  },

  // === İlişkili Dökümanlar ===

  // İade faturası için orijinal fatura referansı
  billingReference: {
    invoiceDocumentReference: {
      id: String,
      issueDate: Date
    }
  },

  // Sipariş referansı
  orderReference: {
    id: String,
    issueDate: Date
  },

  // === Notlar ===
  notes: [{ type: String }],

  // === Sistem Alanları ===

  // İlişkili kayıtlar
  dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'DealerSubscription' },

  // Oluşturan
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Entegratör Bilgileri
  integrator: {
    name: { type: String }, // foriba, logo, parasut, custom
    sentAt: Date,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    response: {
      status: String,
      message: String,
      ettn: String, // e-Fatura Takip Numarası
      receivedAt: Date
    }
  },

  // GİB Durumu
  gibStatus: {
    type: String,
    enum: ['draft', 'pending', 'sent', 'accepted', 'rejected', 'cancelled'],
    default: 'draft'
  },

  // GİB Yanıt Bilgileri
  gibResponse: {
    ettn: String, // Evrensel Tekil Tanımlama Numarası
    envelopeId: String,
    status: String,
    statusCode: String,
    statusDescription: String,
    receivedAt: Date,
    responseXml: String
  },

  // XML İçeriği
  xmlContent: { type: String }, // Oluşturulan UBL-TR XML
  xmlHash: { type: String },    // XML hash değeri

  // İptal/İade Bilgileri
  cancellation: {
    isCancelled: { type: Boolean, default: false },
    cancelledAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    relatedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' } // İade faturası referansı
  },

  // E-Arşiv mi?
  isEArchive: { type: Boolean, default: false },

  // E-Arşiv için ek bilgiler
  eArchive: {
    sendType: { type: String, enum: ['KAGIT', 'ELEKTRONIK'], default: 'ELEKTRONIK' },
    internetSales: {
      websiteUrl: String,
      paymentType: String, // KREDIKARTI, HAVALE, EFT, KAPIDAODEME
      paymentDate: Date,
      shipmentDate: Date,
      shipmentInfo: String
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexler
invoiceSchema.index({ dealer: 1, createdAt: -1 });
invoiceSchema.index({ company: 1, createdAt: -1 });
invoiceSchema.index({ gibStatus: 1 });
invoiceSchema.index({ issueDate: -1 });
invoiceSchema.index({ 'accountingCustomerParty.party.partyIdentification.id': 1 });

// Virtual: Toplam KDV oranı
invoiceSchema.virtual('effectiveTaxRate').get(function() {
  if (this.legalMonetaryTotal.taxExclusiveAmount === 0) return 0;
  return (this.taxTotal.taxAmount / this.legalMonetaryTotal.taxExclusiveAmount) * 100;
});

// Pre-save: UUID oluştur
invoiceSchema.pre('save', async function(next) {
  if (!this.uuid) {
    const { v4: uuidv4 } = require('uuid');
    this.uuid = uuidv4();
  }

  // Fatura numarası oluştur
  if (!this.invoiceNumber) {
    const prefix = this.isEArchive ? 'EAR' : 'EFT';
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      invoiceNumber: new RegExp(`^${prefix}${year}`)
    });
    this.invoiceNumber = `${prefix}${year}${String(count + 1).padStart(9, '0')}`;
  }

  // Issue time yoksa ekle
  if (!this.issueTime && this.issueDate) {
    const date = new Date(this.issueDate);
    this.issueTime = date.toTimeString().split(' ')[0];
  }

  next();
});

// Static: Fatura numarası ile bul
invoiceSchema.statics.findByNumber = function(invoiceNumber) {
  return this.findOne({ invoiceNumber });
};

// Static: UUID ile bul
invoiceSchema.statics.findByUUID = function(uuid) {
  return this.findOne({ uuid });
};

// Method: GİB'e gönderildi olarak işaretle
invoiceSchema.methods.markAsSent = function(integratorName, ettn) {
  this.gibStatus = 'sent';
  this.integrator.name = integratorName;
  this.integrator.sentAt = new Date();
  if (ettn) {
    this.gibResponse.ettn = ettn;
  }
  return this.save();
};

// Method: GİB kabul etti
invoiceSchema.methods.markAsAccepted = function(responseData) {
  this.gibStatus = 'accepted';
  this.gibResponse = {
    ...this.gibResponse,
    ...responseData,
    receivedAt: new Date()
  };
  return this.save();
};

// Method: GİB reddetti
invoiceSchema.methods.markAsRejected = function(responseData) {
  this.gibStatus = 'rejected';
  this.gibResponse = {
    ...this.gibResponse,
    ...responseData,
    receivedAt: new Date()
  };
  return this.save();
};

// Method: İptal et
invoiceSchema.methods.cancel = function(userId, reason) {
  this.gibStatus = 'cancelled';
  this.cancellation = {
    isCancelled: true,
    cancelledAt: new Date(),
    cancelledBy: userId,
    reason
  };
  return this.save();
};

module.exports = mongoose.model('Invoice', invoiceSchema);
