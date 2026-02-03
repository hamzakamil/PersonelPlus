const mongoose = require('mongoose');

const workplaceSectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  workplace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workplace',
    required: true
  },
  parentSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkplaceSection',
    default: null // Hiyerarşik yapı için
  },
  description: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // Bölüm yöneticisi
  }
}, {
  timestamps: true
});

// Index for efficient queries
workplaceSectionSchema.index({ workplace: 1 });
workplaceSectionSchema.index({ workplace: 1, parentSection: 1 });
workplaceSectionSchema.index({ workplace: 1, isActive: 1 });

module.exports = mongoose.model('WorkplaceSection', workplaceSectionSchema);




