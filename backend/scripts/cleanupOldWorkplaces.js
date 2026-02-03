/**
 * Eski işyerlerini temizleme scripti
 *
 * İşlem:
 * 1. "Merkez", "Satın", "Alma", "ana" isimli eski işyerlerini bul
 * 2. Bu işyerlerine bağlı çalışan/yönetici varsa yeni işyerine aktar
 * 3. Boş kalan eski işyerlerini sil
 *
 * Kullanım: node scripts/cleanupOldWorkplaces.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const Employee = require('../models/Employee');
const Department = require('../models/Department');

// Eski işyeri isimleri (küçük harfe çevrilecek)
const OLD_WORKPLACE_NAMES = ['merkez', 'satın', 'alma', 'ana', 'merkez işyeri'];

async function analyzeAndCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pys');
    console.log('MongoDB bağlantısı başarılı\n');

    // Tüm şirketleri al
    const companies = await Company.find({ isActive: true });
    console.log(`Toplam ${companies.length} aktif şirket bulundu\n`);

    let totalTransferred = 0;
    let totalDeleted = 0;

    for (const company of companies) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`ŞİRKET: ${company.name}`);
      console.log('='.repeat(60));

      // Bu şirketin tüm işyerlerini al
      const workplaces = await Workplace.find({
        company: company._id,
        isActive: true
      }).populate('manager', 'firstName lastName');

      if (workplaces.length === 0) {
        console.log('  İşyeri bulunamadı, atlanıyor...');
        continue;
      }

      console.log(`  Toplam ${workplaces.length} aktif işyeri var:`);
      workplaces.forEach(wp => {
        console.log(`    - ${wp.name} (${wp._id}) ${wp.isDefault ? '[VARSAYILAN]' : ''}`);
      });

      // Şirket adıyla eşleşen "yeni" işyerini bul (varsayılan veya şirket adıyla aynı)
      let targetWorkplace = workplaces.find(wp => wp.isDefault === true);

      if (!targetWorkplace) {
        // Varsayılan yoksa şirket adıyla benzer olanı ara
        targetWorkplace = workplaces.find(wp =>
          wp.name.toLowerCase().includes(company.name.toLowerCase().substring(0, 10))
        );
      }

      if (!targetWorkplace) {
        // Hala bulunamadıysa ilk işyerini al
        targetWorkplace = workplaces[0];
      }

      console.log(`\n  Hedef işyeri: ${targetWorkplace.name} (${targetWorkplace._id})`);

      // Eski işyerlerini bul (varsayılan olanları ATLAMA!)
      const oldWorkplaces = workplaces.filter(wp => {
        // Hedef işyerini atla
        if (wp._id.toString() === targetWorkplace._id.toString()) return false;
        // Varsayılan işyerini atla
        if (wp.isDefault === true) return false;
        const nameLower = wp.name.toLowerCase().trim();
        return OLD_WORKPLACE_NAMES.some(oldName => nameLower === oldName || nameLower.includes(oldName));
      });

      if (oldWorkplaces.length === 0) {
        console.log('  Eski işyeri bulunamadı.');
        continue;
      }

      console.log(`\n  ${oldWorkplaces.length} eski işyeri bulundu:`);

      for (const oldWp of oldWorkplaces) {
        console.log(`\n  [ESKİ] ${oldWp.name} (${oldWp._id})`);

        // Bu işyerine bağlı çalışanları bul
        const employees = await Employee.find({
          workplace: oldWp._id,
          isActive: true
        });
        console.log(`    - ${employees.length} çalışan bağlı`);

        // Bu işyerine bağlı departmanları bul
        const departments = await Department.find({
          workplace: oldWp._id,
          isActive: true
        });
        console.log(`    - ${departments.length} departman bağlı`);

        // Yönetici var mı?
        if (oldWp.manager) {
          console.log(`    - Yönetici: ${oldWp.manager.firstName} ${oldWp.manager.lastName}`);
        }

        // Çalışanları yeni işyerine aktar
        if (employees.length > 0) {
          const result = await Employee.updateMany(
            { workplace: oldWp._id },
            { $set: { workplace: targetWorkplace._id } }
          );
          console.log(`    ✓ ${result.modifiedCount} çalışan ${targetWorkplace.name}'e aktarıldı`);
          totalTransferred += result.modifiedCount;
        }

        // Departmanları yeni işyerine aktar
        if (departments.length > 0) {
          const result = await Department.updateMany(
            { workplace: oldWp._id },
            { $set: { workplace: targetWorkplace._id } }
          );
          console.log(`    ✓ ${result.modifiedCount} departman ${targetWorkplace.name}'e aktarıldı`);
        }

        // Eski işyerini sil (soft delete - isActive = false)
        await Workplace.findByIdAndUpdate(oldWp._id, { isActive: false });
        console.log(`    ✗ ${oldWp.name} pasife alındı (silindi)`);
        totalDeleted++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('ÖZET');
    console.log('='.repeat(60));
    console.log(`Toplam aktarılan çalışan: ${totalTransferred}`);
    console.log(`Toplam silinen işyeri: ${totalDeleted}`);
    console.log('\nİşlem tamamlandı!');

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB bağlantısı kapatıldı');
  }
}

// DRY RUN modu (sadece analiz, değişiklik yapmaz)
async function dryRun() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pys');
    console.log('MongoDB bağlantısı başarılı');
    console.log('\n*** DRY RUN MODU - DEĞİŞİKLİK YAPILMAYACAK ***\n');

    const companies = await Company.find({ isActive: true });

    for (const company of companies) {
      const workplaces = await Workplace.find({
        company: company._id,
        isActive: true
      }).populate('manager', 'firstName lastName');

      if (workplaces.length <= 1) continue;

      // Varsayılan işyerini bul
      const defaultWp = workplaces.find(wp => wp.isDefault === true);

      // Eski işyerlerini bul (varsayılan olanları ATLAMA!)
      const oldWorkplaces = workplaces.filter(wp => {
        if (wp.isDefault === true) return false; // Varsayılanı atla
        const nameLower = wp.name.toLowerCase().trim();
        return OLD_WORKPLACE_NAMES.some(oldName => nameLower === oldName || nameLower.includes(oldName));
      });

      if (oldWorkplaces.length === 0) continue;

      console.log(`\nŞİRKET: ${company.name}`);
      console.log(`  İşyerleri: ${workplaces.map(w => `${w.name}${w.isDefault ? ' [V]' : ''}`).join(', ')}`);
      if (defaultWp) {
        console.log(`  Hedef (Varsayılan): ${defaultWp.name}`);
      }

      for (const oldWp of oldWorkplaces) {
        const employees = await Employee.find({ workplace: oldWp._id, isActive: true });
        const departments = await Department.find({ workplace: oldWp._id, isActive: true });

        console.log(`  [SİLİNECEK] ${oldWp.name}:`);
        console.log(`    - ${employees.length} çalışan → aktarılacak`);
        console.log(`    - ${departments.length} departman → aktarılacak`);
        if (oldWp.manager) {
          console.log(`    - Yönetici: ${oldWp.manager.firstName} ${oldWp.manager.lastName}`);
        }
      }
    }

  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Komut satırı argümanına göre çalıştır
const args = process.argv.slice(2);
if (args.includes('--dry-run') || args.includes('-d')) {
  console.log('DRY RUN modu başlatılıyor...\n');
  dryRun();
} else {
  console.log('Temizlik scripti başlatılıyor...\n');
  console.log('NOT: Önce --dry-run ile test etmeniz önerilir!\n');
  analyzeAndCleanup();
}
