/**
 * Kullanıcı ile Çalışan kaydını bağlama scripti
 *
 * Kullanım: node scripts/linkUserToEmployee.js <user_email>
 *
 * Bu script, User kaydındaki employee alanı null olan kullanıcıları
 * email adresine göre Employee kaydına bağlar.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

// Tüm modelleri yükle
require('../models/Role');
require('../models/Company');
require('../models/Dealer');
require('../models/Employee');
require('../models/User');

const User = mongoose.model('User');
const Employee = mongoose.model('Employee');
const Role = mongoose.model('Role');

async function linkUserToEmployee(userEmailOrId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı');

    // Kullanıcıyı bul (email veya ID ile)
    let user;
    if (mongoose.Types.ObjectId.isValid(userEmailOrId)) {
      user = await User.findById(userEmailOrId).populate('role company');
    }
    if (!user) {
      user = await User.findOne({ email: userEmailOrId.toLowerCase() }).populate('role company');
    }
    if (!user) {
      console.log('Kullanıcı bulunamadı:', userEmailOrId);
      return;
    }

    console.log('\n=== Kullanıcı Bilgileri ===');
    console.log('User ID:', user._id);
    console.log('Email:', user.email);
    console.log('Role:', user.role?.name);
    console.log('Company:', user.company?.name || user.company);
    console.log('Employee:', user.employee);

    if (user.employee) {
      console.log('\n✓ Kullanıcı zaten bir çalışana bağlı!');
      const employee = await Employee.findById(user.employee);
      if (employee) {
        console.log('Employee:', employee.firstName, employee.lastName, '-', employee.email);
      }
      return;
    }

    // Employee'yi email ile bul
    const employee = await Employee.findOne({
      email: userEmail.toLowerCase(),
      status: 'active'
    });

    if (!employee) {
      console.log('\n✗ Bu email ile aktif çalışan bulunamadı!');

      // Tüm eşleşen çalışanları göster
      const allEmployees = await Employee.find({ email: userEmail.toLowerCase() });
      if (allEmployees.length > 0) {
        console.log('\nBulunan çalışanlar (tüm durumlar):');
        allEmployees.forEach(e => {
          console.log(`  - ${e._id}: ${e.firstName} ${e.lastName} (status: ${e.status})`);
        });
      }
      return;
    }

    console.log('\n=== Eşleşen Çalışan ===');
    console.log('Employee ID:', employee._id);
    console.log('Ad Soyad:', employee.firstName, employee.lastName);
    console.log('TC Kimlik:', employee.tcKimlik);
    console.log('Email:', employee.email);

    // Bağlantıyı oluştur
    user.employee = employee._id;
    await user.save();

    console.log('\n✓ Kullanıcı çalışana başarıyla bağlandı!');

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB bağlantısı kapatıldı');
  }
}

// Tüm bağlantısız kullanıcıları listele
async function listUnlinkedUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı\n');

        const employeeRole = await Role.findOne({ name: 'employee' });

    if (!employeeRole) {
      console.log('Employee rolü bulunamadı');
      return;
    }

    const unlinkedUsers = await User.find({
      role: employeeRole._id,
      employee: null
    }).populate('company', 'name');

    console.log('=== Employee alanı NULL olan kullanıcılar ===\n');

    if (unlinkedUsers.length === 0) {
      console.log('Bağlantısız kullanıcı yok.');
      return;
    }

    for (const user of unlinkedUsers) {
      console.log(`User: ${user.email}`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Company: ${user.company?.name || 'N/A'}`);

      // Eşleşen employee var mı kontrol et
      const employee = await Employee.findOne({ email: user.email?.toLowerCase() });
      if (employee) {
        console.log(`  Eşleşen Employee: ${employee._id} (${employee.firstName} ${employee.lastName})`);
      } else {
        console.log(`  Eşleşen Employee: YOK`);
      }
      console.log('');
    }

    console.log(`Toplam: ${unlinkedUsers.length} bağlantısız kullanıcı`);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Tüm bağlantısız kullanıcıları otomatik bağla
// Tüm bağlantısız veya kırık bağlantılı kullanıcıları otomatik bağla
async function autoLinkAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB bağlantısı başarılı\n');

    const employeeRole = await Role.findOne({ name: 'employee' });

    // Employee null olan veya kırık bağlantısı olan kullanıcıları bul
    const allEmployeeUsers = await User.find({ role: employeeRole._id });

    let linked = 0;
    let notFound = 0;
    let alreadyLinked = 0;
    let brokenFixed = 0;

    for (const user of allEmployeeUsers) {
      // Employee alanı var mı ve varsa gerçekten mevcut mu?
      if (user.employee) {
        const existingEmployee = await Employee.findById(user.employee);
        if (existingEmployee) {
          alreadyLinked++;
          continue; // Bu kullanıcı zaten doğru bağlı
        }
        // Kırık bağlantı var - düzeltilmesi gerekiyor
        console.log(`⚠ ${user.email} - kırık bağlantı (Employee ID ${user.employee} mevcut değil)`);
      }

      // Email ile doğru employee'yi bul
      const employee = await Employee.findOne({
        email: user.email?.toLowerCase(),
        status: 'active'
      });

      if (employee) {
        const wasBroken = user.employee !== null;
        user.employee = employee._id;
        await user.save();

        if (wasBroken) {
          console.log(`✓ ${user.email} -> ${employee.firstName} ${employee.lastName} (kırık bağlantı düzeltildi)`);
          brokenFixed++;
        } else {
          console.log(`✓ ${user.email} -> ${employee.firstName} ${employee.lastName}`);
          linked++;
        }
      } else if (!user.employee) {
        console.log(`✗ ${user.email} - eşleşen çalışan yok`);
        notFound++;
      }
    }

    console.log(`\n=== Sonuç ===`);
    console.log(`Zaten bağlı: ${alreadyLinked}`);
    console.log(`Yeni bağlanan: ${linked}`);
    console.log(`Kırık bağlantı düzeltilen: ${brokenFixed}`);
    console.log(`Eşleşen çalışan bulunamayan: ${notFound}`);

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Komut satırı argümanlarını işle
const args = process.argv.slice(2);
const command = args[0];

if (command === '--list') {
  listUnlinkedUsers();
} else if (command === '--auto') {
  autoLinkAll();
} else if (command) {
  linkUserToEmployee(command);
} else {
  console.log('Kullanım:');
  console.log('  node scripts/linkUserToEmployee.js <email>   - Belirli kullanıcıyı bağla');
  console.log('  node scripts/linkUserToEmployee.js --list   - Bağlantısız kullanıcıları listele');
  console.log('  node scripts/linkUserToEmployee.js --auto   - Tüm bağlantısızları otomatik bağla');
}
