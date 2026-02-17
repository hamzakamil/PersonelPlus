const mongoose = require('mongoose');

const officialHolidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['national', 'religious', 'important', 'half_day'],
      default: 'important',
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    halfDayPeriod: {
      type: String,
      enum: ['morning', 'afternoon', null],
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    isRecurring: {
      type: Boolean,
      default: true, // Sabit tatiller için true, değişken (dini) tatiller için false
    },
  },
  {
    timestamps: true,
  }
);

// Unique index: Aynı tarih ve isimde sadece bir tatil olabilir
officialHolidaySchema.index({ date: 1, name: 1 }, { unique: true });
officialHolidaySchema.index({ year: 1, date: 1 });

module.exports = mongoose.model('OfficialHoliday', officialHolidaySchema);
