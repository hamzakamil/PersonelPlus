const mongoose = require('mongoose');
require('dotenv').config();
const LeaveType = require('../models/LeaveType');
const LeaveSubType = require('../models/LeaveSubType');
const { initializeGlobalLeaveTypes } = require('../services/leaveTypeInitializer');

async function init() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pys');
    console.log('MongoDB bağlandı');

    await initializeGlobalLeaveTypes();
    console.log('✅ Global izin türleri oluşturuldu');

    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

init();




