            const mongoose = require('mongoose');

const companyHolidayCalendarSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  // Eski format desteği için basit tarih dizisi
  holidays: [{
    type: Date,
    required: true
  }],
  // Yeni format: Yarım gün tatil desteği (arefe, 29 Ekim vb.)
  holidayDetails: [{
    date: {
      type: Date,
      required: true
    },
    name: {
      type: String,
      default: null // Tatil adı (Arefe, 29 Ekim Öğleden Sonra vb.)
    },
    isHalfDay: {
      type: Boolean,
      default: false // Yarım gün mü?
    },
    halfDayPeriod: {
      type: String,
      enum: ['morning', 'afternoon', null], // Sabah mı öğleden sonra mı?
      default: null
    }
  }]
}, {
  timestamps: true
});

// Unique constraint: Bir şirket için bir yıl sadece bir kez olabilir
companyHolidayCalendarSchema.index({ companyId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('CompanyHolidayCalendar', companyHolidayCalendarSchema);




