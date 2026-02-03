const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  // Kullanıcı
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Genel Kanal Tercihleri
  channels: {
    push: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    inApp: {
      type: Boolean,
      default: true // Her zaman true kalmalı
    }
  },

  // Bildirim Tipi Bazında Tercihler
  types: {
    // İzin Talepleri
    LEAVE_REQUEST: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    LEAVE_APPROVED: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    LEAVE_REJECTED: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },

    // Avans Talepleri
    ADVANCE_REQUEST: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    ADVANCE_APPROVED: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    ADVANCE_REJECTED: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },

    // Fazla Mesai
    OVERTIME_REQUEST: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    OVERTIME_APPROVED: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    OVERTIME_REJECTED: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },

    // Mesajlar
    MESSAGE_RECEIVED: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false } // Mesajlar için varsayılan email kapalı
    },

    // İşe Giriş/Çıkış
    EMPLOYMENT_STATUS: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },

    // Masraf
    EXPENSE_REQUEST: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    EXPENSE_APPROVED: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },

    // Sistem & Duyuru
    SYSTEM: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    },
    REMINDER: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false }
    },
    ANNOUNCEMENT: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true }
    }
  },

  // Sessiz Saatler (Rahatsız Etme)
  quietHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    start: {
      type: String,
      default: '22:00' // HH:mm formatı
    },
    end: {
      type: String,
      default: '08:00' // HH:mm formatı
    },
    // Hafta sonları tamamen sessiz mi?
    weekendsQuiet: {
      type: Boolean,
      default: false
    }
  },

  // Zaman Dilimi
  timezone: {
    type: String,
    default: 'Europe/Istanbul'
  },

  // Dil tercihi (bildirim metinleri için)
  language: {
    type: String,
    enum: ['tr', 'en'],
    default: 'tr'
  }
}, {
  timestamps: true
});

// Index
notificationPreferenceSchema.index({ user: 1 }, { unique: true });

// Sessiz saatlerde mi kontrolü
notificationPreferenceSchema.methods.isInQuietHours = function() {
  if (!this.quietHours.enabled) return false;

  const now = new Date();
  const userTimezone = this.timezone || 'Europe/Istanbul';

  // Şu anki saati kullanıcının zaman diliminde al
  const options = { timeZone: userTimezone, hour: '2-digit', minute: '2-digit', hour12: false };
  const currentTime = now.toLocaleTimeString('en-GB', options);

  const [startHour, startMin] = this.quietHours.start.split(':').map(Number);
  const [endHour, endMin] = this.quietHours.end.split(':').map(Number);
  const [currentHour, currentMin] = currentTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const currentMinutes = currentHour * 60 + currentMin;

  // Gece yarısını geçen durumlar için
  if (startMinutes > endMinutes) {
    // Örn: 22:00 - 08:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Örn: 13:00 - 14:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
};

// Hafta sonu mu kontrolü
notificationPreferenceSchema.methods.isWeekend = function() {
  if (!this.quietHours.weekendsQuiet) return false;

  const now = new Date();
  const day = now.getDay();
  return day === 0 || day === 6; // Pazar veya Cumartesi
};

// Belirli bir bildirim tipi için push gönderilebilir mi?
notificationPreferenceSchema.methods.canSendPush = function(notificationType) {
  // Genel push kapalıysa hayır
  if (!this.channels.push) return false;

  // Sessiz saatlerdeyse hayır
  if (this.isInQuietHours()) return false;

  // Hafta sonu sessizse hayır
  if (this.isWeekend()) return false;

  // Tip bazlı kontrol
  const typePrefs = this.types[notificationType];
  if (typePrefs && typePrefs.push !== undefined) {
    return typePrefs.push;
  }

  // Varsayılan: açık
  return true;
};

// Belirli bir bildirim tipi için email gönderilebilir mi?
notificationPreferenceSchema.methods.canSendEmail = function(notificationType) {
  // Genel email kapalıysa hayır
  if (!this.channels.email) return false;

  // Tip bazlı kontrol
  const typePrefs = this.types[notificationType];
  if (typePrefs && typePrefs.email !== undefined) {
    return typePrefs.email;
  }

  // Varsayılan: kapalı
  return false;
};

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
