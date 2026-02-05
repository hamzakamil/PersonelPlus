const mongoose = require('mongoose');

const puantajCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    maxLength: 2
  },
  name: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true // HEX renk kodu
  },
  textColor: {
    type: String,
    default: '#000000' // Metin rengi
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PuantajTemplate',
    required: true
  },
  isSystem: {
    type: Boolean,
    default: false // Sistem tarafından otomatik kullanılan kodlar
  },
  // Otomatik atama için kullanılacak tip
  autoAssignType: {
    type: String,
    enum: [
      'not_worked',       // - - Çalışmadı
      'normal',           // N - Normal çalışma günü
      'weekend',          // H - Hafta tatili
      'public_holiday',   // T - Resmi tatil
      'half_public',      // K - Yarım gün resmi tatil
      'half_weekend',     // C - Yarım gün hafta tatili
      'annual_leave',     // S - Yıllık izin
      'sick_leave',       // R - Raporlu
      'leave',            // İ - İzinli (diğer izinler)
      'absent',           // E - Eksik gün
      'half_day',         // Y - Yarım gün
      'day_overtime',     // O - Gündüz mesaisi
      'night_overtime',   // G - Gece mesaisi
      'custom'            // Özel kod
    ],
    default: 'custom'
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Bir şablonda aynı kod bir kez olabilir
puantajCodeSchema.index({ template: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('PuantajCode', puantajCodeSchema);
