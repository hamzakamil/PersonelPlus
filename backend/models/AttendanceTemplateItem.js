const mongoose = require('mongoose');

const attendanceTemplateItemSchema = new mongoose.Schema({
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceTemplate',
    required: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#6B7280' // Gray default color
  },
  isWorkingDay: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  // Sistem kodu tipi - bu kodun hangi amaçla kullanıldığını belirtir
  systemType: {
    type: String,
    enum: [
      'NOT_EMPLOYED',    // İşe başlamadan önce veya işten çıktıktan sonra (-)
      'NORMAL_WORK',     // Normal çalışma günü (N)
      'WEEKEND',         // Hafta tatili (H)
      'PUBLIC_HOLIDAY',  // Resmi tatil (RT)
      'ANNUAL_LEAVE',    // Yıllık izin (S)
      'SICK_LEAVE',      // Hastalık/Rapor izni (R)
      'UNPAID_LEAVE',    // Ücretsiz izin (U)
      'OTHER_LEAVE',     // Diğer izinler (D)
      null               // Kullanıcı tanımlı (özel kodlar)
    ],
    default: null
  },
  isSystemCode: {
    type: Boolean,
    default: false // Sistem tarafından otomatik kullanılan kod mu?
  }
}, {
  timestamps: true
});

// Compound index to ensure unique code per template
attendanceTemplateItemSchema.index({ template: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceTemplateItem', attendanceTemplateItemSchema);

