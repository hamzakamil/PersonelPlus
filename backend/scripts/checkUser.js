const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

require('../models/Role');
require('../models/Company');
require('../models/Dealer');
require('../models/Employee');
require('../models/User');
require('../models/Bordro');

const User = mongoose.model('User');
const Bordro = mongoose.model('Bordro');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB bağlantısı başarılı\n');

  const userId = '6983338a854472c06d59191f';

  const Employee = mongoose.model('Employee');

  // User'ı populate OLMADAN getir
  const userRaw = await User.findById(userId);
  console.log('=== User (Raw - no populate) ===');
  console.log('ID:', userRaw?._id);
  console.log('Email:', userRaw?.email);
  console.log('Employee field:', userRaw?.employee);

  // Employee var mı kontrol et
  if (userRaw?.employee) {
    const emp = await Employee.findById(userRaw.employee);
    console.log('\n=== Employee Check ===');
    console.log('Employee ID:', userRaw.employee);
    console.log('Employee exists?:', emp ? 'YES' : 'NO!!! Employee document not found!');
    if (emp) {
      console.log('Name:', emp.firstName, emp.lastName);
      console.log('Status:', emp.status);
    }
  }

  // User'ı populate ile getir
  const user = await User.findById(userId)
    .populate('role')
    .populate('company')
    .populate('employee');

  console.log('\n=== User (with populate) ===');
  console.log('ID:', user?._id);
  console.log('Email:', user?.email);
  console.log('Role:', user?.role?.name);
  console.log('Company:', user?.company?.name);
  console.log('Employee field after populate:', user?.employee);

  // Email ile employee ara
  const empByEmail = await Employee.findOne({ email: userRaw?.email?.toLowerCase() });
  console.log('\n=== Email ile Employee Arama ===');
  console.log('Email:', userRaw?.email?.toLowerCase());
  console.log('Bulunan Employee:', empByEmail ? empByEmail._id + ' - ' + empByEmail.firstName + ' ' + empByEmail.lastName : 'YOK');

  if (!user?.employee && empByEmail) {
    console.log('\n=== DÜZELTME ===');
    console.log('User.employee alanı güncelleniyor...');
    await User.findByIdAndUpdate(userId, { employee: empByEmail._id });
    console.log('✓ User.employee güncellendi:', empByEmail._id);
  }

  if (user?.employee) {
    console.log('\n=== Employee ===');
    console.log('ID:', user.employee._id);
    console.log('Name:', user.employee.firstName, user.employee.lastName);
    console.log('TC:', user.employee.tcKimlik);

    // Bu çalışan için bordro var mı?
    const bordros = await Bordro.find({ employee: user.employee._id });
    console.log('\n=== Bordrolar ===');
    console.log('Toplam bordro:', bordros.length);
    bordros.forEach(b => {
      console.log(`  - ${b.year}/${b.month}: status=${b.status}`);
    });
  } else {
    console.log('\n!!! UYARI: Employee field NULL !!!');
  }

  await mongoose.disconnect();
}

check().catch(console.error);
