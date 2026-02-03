const mongoose = require('mongoose');

// NOT: Şifreleme/çözme işlemleri route ve service katmanında yapılmaktadır

const whatsAppSettingsSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true // Her şirket için tek bir WhatsApp ayarı
  },
  whatsappBusinessNumber: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        // +90 ile başlamalı ve geçerli telefon formatında olmalı
        return /^\+90\s?[0-9]{3}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/.test(v);
      },
      message: 'WhatsApp işletme numarası +90 ile başlamalı ve geçerli formatta olmalıdır (örn: +90 532 000 00 00)'
    }
  },
  apiProvider: {
    type: String,
    enum: ['Meta Cloud API', 'Twilio', 'Diğer'],
    default: 'Meta Cloud API',
    required: true
  },
  apiKey: {
    type: String,
    required: true
    // Şifreleme/çözme işlemleri route/service katmanında yapılacak
  },
  messageTemplates: {
    type: mongoose.Schema.Types.Mixed, // JSON formatında saklanacak
    default: {
      onEmployeeOnboarding: 'Sayın {employeeName}, {companyName} şirketine hoş geldiniz! İşe giriş tarihiniz: {hireDate}',
      onEmployeeOffboarding: 'Sayın {employeeName}, {companyName} şirketinden ayrılışınız {exitDate} tarihinde gerçekleşmiştir.',
      onLeaveRequestSubmitted: 'Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz alınmıştır. Onay sürecinde bilgilendirileceksiniz.',
      onLeaveApproved: 'Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz onaylanmıştır.',
      onLeaveRejected: 'Sayın {employeeName}, {reason} nedeniyle {startDate} - {endDate} tarihleri arasındaki izin talebiniz reddedilmiştir.'
    }
  },
  isActive: {
    type: Boolean,
    default: false // Varsayılan olarak pasif
  },
  lastTestedAt: {
    type: Date,
    default: null // Son test tarihi
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    // API response'da apiKey'i gizle (güvenlik)
    transform: function(doc, ret) {
      if (ret.apiKey) {
        ret.apiKey = '***ENCRYPTED***';
      }
      return ret;
    }
  }
});

// NOT: company alanında unique: true olduğu için otomatik index oluşur, ayrı index tanımlamaya gerek yok

// Virtual: Şifrelenmiş API key'i döndür (güvenlik için)
whatsAppSettingsSchema.virtual('encryptedApiKey').get(function() {
  return this.apiKey ? '***ENCRYPTED***' : null;
});

module.exports = mongoose.model('WhatsAppSettings', whatsAppSettingsSchema);

