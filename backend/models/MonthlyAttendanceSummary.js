const mongoose = require('mongoose');

const monthlyAttendanceSummarySchema = new mongoose.Schema({
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
  totalWorkDays: {
    type: Number,
    default: 0 // Çalışılan gün sayısı
  },
  totalWorkHours: {
    type: Number,
    default: 0 // Toplam çalışma saati
  },
  totalLateCount: {
    type: Number,
    default: 0 // Geç kalma sayısı
  },
  totalLateDuration: {
    type: Number,
    default: 0 // Toplam geç kalma dakikası
  },
  totalAbsentDays: {
    type: Number,
    default: 0 // Devamsızlık gün sayısı
  },
  totalOvertimeHours: {
    type: Number,
    default: 0 // Fazla mesai saati
  },
  totalEarlyDepartures: {
    type: Number,
    default: 0 // Erken çıkış sayısı
  },
  expectedWorkDays: {
    type: Number,
    default: 0 // Beklenen çalışma günü (tatiller hariç)
  },
  performanceScore: {
    type: Number,
    default: 100, // 0-100 arası puan
    min: 0,
    max: 100
  },
  // Detaylı istatistikler
  lateArrivals: [{
    date: Date,
    minutes: Number
  }],
  absences: [{
    date: Date,
    isExcused: Boolean,
    reason: String
  }],
  earlyDepartures: [{
    date: Date,
    minutes: Number
  }],
  overtime: [{
    date: Date,
    hours: Number
  }]
}, {
  timestamps: true
});

// Index for efficient queries
monthlyAttendanceSummarySchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });
monthlyAttendanceSummarySchema.index({ company: 1, year: 1, month: 1 });

module.exports = mongoose.model('MonthlyAttendanceSummary', monthlyAttendanceSummarySchema);
