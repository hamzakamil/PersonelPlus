const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  permission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  },
  // Bayi yetkilisi için özel yetki ataması
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null ise sistem yetkisi, dolu ise bayi tarafından atanmış
  },
  // Bayi yetkilisi için hangi şirketlerde geçerli
  companies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }]
}, {
  timestamps: true
});

// Aynı rol ve yetki kombinasyonunun tekrarını önle
rolePermissionSchema.index({ role: 1, permission: 1, assignedBy: 1 }, { unique: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);

