const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function debug() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pys';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected!\n');

    // Direct collection queries
    const db = mongoose.connection.db;

    const dealers = await db.collection('dealers').find({}).toArray();
    console.log('=== BAYILER ===');
    console.log('Toplam:', dealers.length);
    dealers.forEach(d => {
      console.log(`  - ${d.name} (${d._id})`);
      console.log(`    selfCompany: ${d.selfCompany || 'YOK'}`);
    });

    const companies = await db.collection('companies').find({}).toArray();
    console.log('\n=== SIRKETLER ===');
    console.log('Toplam:', companies.length);
    companies.forEach(c => {
      console.log(`  - ${c.name} (${c._id})`);
      console.log(`    isDealerSelfCompany: ${c.isDealerSelfCompany || false}`);
      console.log(`    dealer: ${c.dealer}`);
    });

    const users = await db.collection('users').find({}).toArray();
    console.log('\n=== KULLANICILAR ===');
    console.log('Toplam:', users.length);
    users.forEach(u => {
      console.log(`  - ${u.email} | dealer: ${u.dealer || '-'} | company: ${u.company || '-'}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}
debug();
