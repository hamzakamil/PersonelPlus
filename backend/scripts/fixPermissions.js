const mongoose = require('mongoose');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const RolePermission = require('../models/RolePermission');

require('dotenv').config();

const fixPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personel_yonetim');

    console.log('Yetkiler düzeltiliyor...');

    // 1. attendance:approve yetkisini kontrol et ve oluştur
    let attendanceApprovePerm = await Permission.findOne({ name: 'attendance:approve' });
    if (!attendanceApprovePerm) {
      attendanceApprovePerm = await Permission.create({
        name: 'attendance:approve',
        description: 'İşe giriş/çıkış onayı',
        category: 'attendance'
      });
      console.log('✓ attendance:approve yetkisi oluşturuldu');
    } else {
      console.log('✓ attendance:approve yetkisi zaten mevcut');
    }

    // 2. bayi_admin rolünü bul
    const bayiAdminRole = await Role.findOne({ name: 'bayi_admin' });
    if (!bayiAdminRole) {
      console.error('✗ bayi_admin rolü bulunamadı!');
      process.exit(1);
    }

    // 3. bayi_admin rolüne attendance:approve yetkisini ata
    const existingRolePermission = await RolePermission.findOne({
      role: bayiAdminRole._id,
      permission: attendanceApprovePerm._id
    });

    if (!existingRolePermission) {
      await RolePermission.create({
        role: bayiAdminRole._id,
        permission: attendanceApprovePerm._id,
        assignedBy: null
      });
      console.log('✓ bayi_admin rolüne attendance:approve yetkisi atandı');
    } else {
      console.log('✓ bayi_admin rolü zaten attendance:approve yetkisine sahip');
    }

    // 4. resmi_muhasebe_ik rolünü bul ve yetki ata
    const resmiMuhasebeRole = await Role.findOne({ name: 'resmi_muhasebe_ik' });
    if (resmiMuhasebeRole) {
      const existingResmiRolePermission = await RolePermission.findOne({
        role: resmiMuhasebeRole._id,
        permission: attendanceApprovePerm._id
      });

      if (!existingResmiRolePermission) {
        await RolePermission.create({
          role: resmiMuhasebeRole._id,
          permission: attendanceApprovePerm._id,
          assignedBy: null
        });
        console.log('✓ resmi_muhasebe_ik rolüne attendance:approve yetkisi atandı');
      } else {
        console.log('✓ resmi_muhasebe_ik rolü zaten attendance:approve yetkisine sahip');
      }
    } else {
      console.log('⚠ resmi_muhasebe_ik rolü bulunamadı (opsiyonel)');
    }

    console.log('\n✅ Yetki düzeltme işlemi tamamlandı!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
};

fixPermissions();
