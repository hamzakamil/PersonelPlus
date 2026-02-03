const mongoose = require('mongoose');
const Role = require('../models/Role');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const initRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personel_yonetim');

    // Create roles
    const roles = [
      { name: 'super_admin', description: 'Süper Admin' },
      { name: 'bayi_admin', description: 'Bayi Admin' },
      { name: 'company_admin', description: 'Şirket Admin' },
      { name: 'resmi_muhasebe_ik', description: 'Resmi Muhasebe/İK' },
      { name: 'employee', description: 'Çalışan' }
    ];

    for (const roleData of roles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`Rol oluşturuldu: ${roleData.name}`);
      } else {
        console.log(`Rol zaten mevcut: ${roleData.name}`);
      }
    }

    // Create super admin user if not exists
    const superAdminRole = await Role.findOne({ name: 'super_admin' });
    const existingSuperAdmin = await User.findOne({ role: superAdminRole._id });
    
    if (!existingSuperAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        email: 'admin@admin.com',
        password: hashedPassword,
        role: superAdminRole._id
      });
      console.log('Super admin kullanıcısı oluşturuldu: admin@admin.com / admin123');
    } else {
      console.log('Super admin kullanıcısı zaten mevcut');
    }

    console.log('Başlangıç verileri oluşturuldu');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
};

initRoles();

