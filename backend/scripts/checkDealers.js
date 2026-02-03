const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Dealer = require('../models/Dealer');
const Company = require('../models/Company');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pys');

  const dealers = await Dealer.find().select('name selfCompany');
  console.log('Bayiler:', dealers.length);
  dealers.forEach(d => console.log('  -', d.name, '| selfCompany:', d.selfCompany || 'YOK'));

  const selfCompanies = await Company.find({ isDealerSelfCompany: true }).select('name dealer');
  console.log('\nKendi Sirketleri:', selfCompanies.length);
  selfCompanies.forEach(c => console.log('  -', c.name));

  await mongoose.disconnect();
}
check();
