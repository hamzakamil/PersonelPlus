const mongoose = require('mongoose');

const dailyAttendanceSummarySchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  expectedCheckIn: {
    type: Date // Beklenen giriş saati (mesai başlangıcı)
  },
  expectedCheckOut: {
    type: Date // Beklenen çıkış saati (mesai bitişi)
  },
  totalWorkMinutes: {
    type: Number,
    default: 0 // Toplam çalışma dakikası
  },
  lateMinutes: {
    type: Number,
    default: 0 // Geç kalma dakikası
  },
  earlyDepartureMinutes: {
    type: Number,
    default: 0 // Erken çıkış dakikası
  },
  overtimeMinutes: {
    type: Number,
    default: 0 // Fazla mesai dakikası
  },
  status: {
    type: String,
    enum: ['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'HALF_DAY', 'WEEKEND', 'HOLIDAY'],
    default: 'ABSENT'
  },
  isExcused: {
    type: Boolean,
    default: false // Mazeret bildirimi var mı?
  },
  excuseReason: {
    type: String
  },
  notes: {
    type: String
  },
  // Check-in kaydı referansı
  checkInRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CheckIn'
  }
}, {
  timestamps: true
});

// Index for efficient queries
dailyAttendanceSummarySchema.index({ employee: 1, date: 1 }, { unique: true });
dailyAttendanceSummarySchema.index({ company: 1, date: 1 });
dailyAttendanceSummarySchema.index({ status: 1 });

module.exports = mongoose.model('DailyAttendanceSummary', dailyAttendanceSummarySchema);
