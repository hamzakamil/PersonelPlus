/**
 * SGK Meslek Kodları Excel Import Script
 *
 * Kullanım:
 *   node scripts/importSgkMeslekKodlari.js <excel-dosya-yolu>
 *
 * Örnek:
 *   node scripts/importSgkMeslekKodlari.js ./data/sgk-meslek-kodlari.xlsx
 *
 * Excel Formatı:
 *   - İlk sütun (A): Meslek Kodu
 *   - İkinci sütun (B): Meslek Adı
 *   - İlk satır başlık olarak kabul edilir ve atlanır
 */

const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SgkMeslekKodu = require('../models/SgkMeslekKodu');

async function importFromExcel(filePath) {
  try {
    // MongoDB bağlantısı
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pys';
    console.log('MongoDB bağlantısı kuruluyor...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB bağlantısı başarılı.\n');

    // Excel dosyasını oku
    console.log(`Excel dosyası okunuyor: ${filePath}`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // JSON'a çevir (header: 1 = array olarak al)
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Toplam satır sayısı: ${data.length}`);
    console.log(`İlk satır (başlık): ${data[0]}\n`);

    // Mevcut kayıtları temizle (opsiyonel)
    const existingCount = await SgkMeslekKodu.countDocuments();
    if (existingCount > 0) {
      console.log(`Mevcut ${existingCount} kayıt siliniyor...`);
      await SgkMeslekKodu.deleteMany({});
      console.log('Mevcut kayıtlar silindi.\n');
    }

    // Verileri hazırla (ilk satırı atla - başlık)
    const records = [];
    let skipped = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Boş satırları atla
      if (!row || !row[0] || !row[1]) {
        skipped++;
        continue;
      }

      const kod = String(row[0]).trim();
      const ad = String(row[1]).trim();

      // Boş değerleri atla
      if (!kod || !ad) {
        skipped++;
        continue;
      }

      // Normalize edilmiş ad
      const adNormalized = ad
        .toLowerCase()
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'i')
        .replace(/Ğ/g, 'g')
        .replace(/Ü/g, 'u')
        .replace(/Ş/g, 's')
        .replace(/Ö/g, 'o')
        .replace(/Ç/g, 'c');

      records.push({
        kod,
        ad,
        adNormalized
      });
    }

    console.log(`İşlenecek kayıt sayısı: ${records.length}`);
    console.log(`Atlanan satır sayısı: ${skipped}\n`);

    // Toplu ekleme (batch insert)
    if (records.length > 0) {
      console.log('Kayıtlar veritabanına ekleniyor...');

      const batchSize = 1000;
      let inserted = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await SgkMeslekKodu.insertMany(batch, { ordered: false });
        inserted += batch.length;
        console.log(`  İlerleme: ${inserted}/${records.length}`);
      }

      console.log(`\n✅ Toplam ${inserted} meslek kodu başarıyla eklendi.`);
    } else {
      console.log('⚠️ Eklenecek kayıt bulunamadı.');
    }

    // Örnek kayıtları göster
    console.log('\n📋 Örnek kayıtlar:');
    const samples = await SgkMeslekKodu.find().limit(5);
    samples.forEach(s => {
      console.log(`  ${s.kod} - ${s.ad}`);
    });

  } catch (error) {
    console.error('❌ Hata:', error.message);
    if (error.code === 'ENOENT') {
      console.error('   Dosya bulunamadı. Dosya yolunu kontrol edin.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB bağlantısı kapatıldı.');
  }
}

// Komut satırı argümanlarını kontrol et
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         SGK Meslek Kodları Excel Import Script             ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Kullanım:                                                 ║
║    node scripts/importSgkMeslekKodlari.js <excel-dosyasi>  ║
║                                                            ║
║  Örnek:                                                    ║
║    node scripts/importSgkMeslekKodlari.js meslek.xlsx      ║
║                                                            ║
║  Excel Formatı:                                            ║
║    Sütun A: Meslek Kodu (örn: 1111.01)                     ║
║    Sütun B: Meslek Adı (örn: Üst Düzey Yönetici)           ║
║    İlk satır başlık olarak kabul edilir                    ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

const filePath = path.resolve(args[0]);
importFromExcel(filePath);
