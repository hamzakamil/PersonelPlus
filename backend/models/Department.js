const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  workplace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workplace',
    default: null // Departmanın bağlı olduğu SGK İşyeri
  },
  parentDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null // Hiyerarşik yapı için (parentDepartmentId)
  },
  description: {
    type: String
  },
  weekendDays: {
    type: [Number], // [0, 6] for Sunday and Saturday, default from company
    default: null
  },
  workingHours: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkingHours',
    default: null // Departmana atanan mesai saatleri
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false // Varsayılan departman (Merkez) - silinemez
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // Departman yöneticisi
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Department', departmentSchema);

