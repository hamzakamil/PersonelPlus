const mongoose = require('mongoose');

// Günlük puantaj kaydı
const dailyPuantajSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    code: {
      type: String,
      required: true,
      maxLength: 2,
    },
    // Ek bilgiler
    overtimeHours: {
      type: Number,
      default: 0, // Fazla mesai saati
    },
    isManualOverride: {
      type: Boolean,
      default: false, // Manuel olarak değiştirildi mi?
    },
    note: {
      type: String,
    },
  },
  { _id: false }
);

const employeePuantajSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PuantajTemplate',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    // Günlük kayıtlar
    days: [dailyPuantajSchema],
    // Özet bilgiler (hesaplanmış)
    summary: {
      notWorkedDays: { type: Number, default: 0 }, // - Çalışmadı
      normalDays: { type: Number, default: 0 }, // N
      weekendDays: { type: Number, default: 0 }, // H
      publicHolidays: { type: Number, default: 0 }, // T
      annualLeaveDays: { type: Number, default: 0 }, // S
      sickLeaveDays: { type: Number, default: 0 }, // R
      otherLeaveDays: { type: Number, default: 0 }, // İ
      absentDays: { type: Number, default: 0 }, // E
      halfDays: { type: Number, default: 0 }, // Y
      dayOvertimeHours: { type: Number, default: 0 }, // O toplam saat
      nightOvertimeHours: { type: Number, default: 0 }, // G toplam saat
    },
    // Manuel mesai girişleri (puantaj ekranından el ile girilen)
    manualOvertime: {
      dayOvertimeHours: { type: Number, default: 0 }, // Manuel gündüz mesaisi (saat)
      nightOvertimeHours: { type: Number, default: 0 }, // Manuel gece mesaisi (saat)
      note: { type: String }, // Açıklama
    },
    // Avans kesintileri
    advanceDeductions: [
      {
        advanceRequestId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AdvanceRequest',
        },
        amount: {
          type: Number,
          required: true,
        },
        description: {
          type: String, // "Avans Taksiti 2/6" gibi
        },
        isDeducted: {
          type: Boolean,
          default: false,
        },
        deductedAt: {
          type: Date,
        },
      },
    ],
    totalAdvanceDeduction: {
      type: Number,
      default: 0, // Bu aydaki toplam avans kesintisi (TL)
    },
    // SGK günü (null ise çalışma günü/normalDays kullanılır)
    sgkGun: {
      type: Number,
      default: null,
    },
    sgkGunManuallyEdited: {
      type: Boolean,
      default: false,
    },
    sgkGunEditedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'finalized', 'approved'],
      default: 'draft',
    },
    finalizedAt: {
      type: Date,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Bir çalışan için bir ay sadece bir kayıt olabilir
employeePuantajSchema.index({ employee: 1, year: 1, month: 1 }, { unique: true });
employeePuantajSchema.index({ company: 1, year: 1, month: 1 });

module.exports = mongoose.model('EmployeePuantaj', employeePuantajSchema);
