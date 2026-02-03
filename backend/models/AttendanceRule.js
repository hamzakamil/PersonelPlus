const mongoose = require('mongoose');

const attendanceRuleSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null // null ise tüm şirket için geçerli
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  // Çalışma günleri (0=Pazar, 1=Pazartesi, ..., 6=Cumartesi)
  workingDays: {
    type: [Number],
    default: [1, 2, 3, 4, 5] // Pazartesi-Cuma
  },
  // Mesai saatleri
  startTime: {
    type: String, // "09:00" formatında
    required: true,
    default: '09:00'
  },
  endTime: {
    type: String, // "18:00" formatında
    required: true,
    default: '18:00'
  },
  // Tolerans süreleri
  lateToleranceMinutes: {
    type: Number,
    default: 15 // Geç kalma toleransı (dakika)
  },
  earlyDepartureToleranceMinutes: {
    type: Number,
    default: 10 // Erken çıkış toleransı (dakika)
  },
  // Geofencing ayarları
  geofencing: {
    enabled: {
      type: Boolean,
      default: false
    },
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    radiusMeters: {
      type: Number,
      default: 500 // 500 metre yarıçap
    }
  },
  // Diğer ayarlar
  photoRequired: {
    type: Boolean,
    default: false // Fotoğraf çekme zorunlu mu?
  },
  weeklyWorkHours: {
    type: Number,
    default: 40 // Haftalık çalışma saati hedefi
  },
  overtimeApprovalRequired: {
    type: Boolean,
    default: false // Fazla mesai onay gerektiriyor mu?
  },
  // Performans puanlama
  scoringRules: {
    lateArrivalPenalty: {
      type: Number,
      default: -2 // Her geç kalma için puan düşümü
    },
    absentPenalty: {
      type: Number,
      default: -10 // Her devamsızlık için puan düşümü
    },
    earlyDeparturePenalty: {
      type: Number,
      default: -5 // Her erken çıkış için puan düşümü
    },
    overtimeBonus: {
      type: Number,
      default: 1 // 2 saat fazla mesai başına bonus puan
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
attendanceRuleSchema.index({ company: 1, department: 1 });
attendanceRuleSchema.index({ company: 1, isActive: 1 });

module.exports = mongoose.model('AttendanceRule', attendanceRuleSchema);
