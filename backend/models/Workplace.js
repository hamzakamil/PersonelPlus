const mongoose = require('mongoose');

const workplaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  sgkRegisterNumber: {
    type: String,
    default: null // 26 haneli numeric, opsiyonel
  },
  address: {
    type: String
  },
  phone: {
    type: String
  },
  email: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false // Şirket oluşturulduğunda otomatik oluşturulan işyeri
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // SGK İşyeri yöneticisi
  }
}, {
  timestamps: true
});

// Index for efficient queries
workplaceSchema.index({ company: 1 });
workplaceSchema.index({ company: 1, isActive: 1 });

module.exports = mongoose.model('Workplace', workplaceSchema);




