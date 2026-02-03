/**
 * Jest Test Setup
 * Her test dosyasindan once calisir
 *
 * NOT: MongoDB Memory Server'in duzgun calismasi icin:
 * 1. Onceden binary indirilmis olmali: npx mongodb-memory-server download
 * 2. Veya yerel MongoDB kullanilabilir: TEST_MONGODB_URI=mongodb://localhost:27017/test
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Tum modelleri yukle (populate icin gerekli)
require('../models/User');
require('../models/Role');
require('../models/Company');
require('../models/Dealer');
require('../models/Department');
require('../models/Employee');
require('../models/WorkingHours');
require('../models/Workplace');

// MD5 kontrolunu atla (bazi ortamlarda sorun cikariyor)
process.env.MONGOMS_MD5_CHECK = '0';

// Test icin JWT secret ayarla
process.env.JWT_SECRET = 'test-secret-key';

let mongoServer;

/**
 * Test oncesi: MongoDB Memory Server baslat
 */
beforeAll(async () => {
  // Mevcut baglanti varsa kapat
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Yerel MongoDB kullanilabilir (CI/CD veya hata durumu icin)
  if (process.env.TEST_MONGODB_URI) {
    await mongoose.connect(process.env.TEST_MONGODB_URI);
    return;
  }

  // Memory server olustur
  mongoServer = await MongoMemoryServer.create({
    binary: {
      checkMD5: false
    }
  });
  const mongoUri = mongoServer.getUri();

  // Baglan
  await mongoose.connect(mongoUri);
});

/**
 * Her testten sonra: Koleksiyonlari temizle
 * NOT: Bu fonksiyon artık test dosyalarında manuel olarak çağrılmalı
 * beforeAll'da oluşturulan verilerin korunması için global afterEach kaldırıldı
 */
global.cleanupCollections = async (excludeCollections = []) => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    if (!excludeCollections.includes(key)) {
      await collections[key].deleteMany({});
    }
  }
};

/**
 * Tum testler bittikten sonra: Baglanti kapat
 */
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

/**
 * Global test timeout
 */
jest.setTimeout(30000);
