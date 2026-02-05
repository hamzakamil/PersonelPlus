/**
 * Abonelik Cron Jobs
 *
 * Günlük çalışan job'lar:
 * 1. Süresi dolan bayi abonelikleri "expired" yap
 * 2. Kota senkronizasyonu
 * 3. Süre dolmak üzere olan bayi aboneliklere uyarı maili gönder
 * 4. Süresi dolan şirket abonelikleri kontrol et
 * 5. Süre dolmak üzere olan şirket aboneliklere uyarı gönder
 * 6. Ödeme bekleyen şirketleri askıya al
 *
 * Kullanım:
 * - Standalone: node jobs/subscriptionJobs.js
 * - Veya: server.js'de cron job olarak schedule edilebilir
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DealerSubscription = require('../models/DealerSubscription');
const Dealer = require('../models/Dealer');
const Company = require('../models/Company');
const quotaService = require('../services/quotaService');
const emailService = require('../services/emailService');

// MongoDB bağlantısı
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/personel_yonetim';
    await mongoose.connect(mongoUri);
    console.log('MongoDB bağlantısı başarılı');
  }
}

/**
 * 1. Süresi dolan abonelikleri "expired" yap
 */
async function expireSubscriptions() {
  console.log('\n=== Abonelik Süre Kontrolü ===');

  try {
    const now = new Date();

    // Süresi dolan aktif abonelikleri bul
    const expiredSubscriptions = await DealerSubscription.find({
      endDate: { $lt: now },
      status: 'active',
    }).populate('dealer', 'name contactEmail');

    console.log(`Süresi dolan abonelik sayısı: ${expiredSubscriptions.length}`);

    for (const sub of expiredSubscriptions) {
      // Aboneliği expired yap
      sub.status = 'expired';
      sub.history.push({
        action: 'expired',
        date: now,
        note: 'Otomatik süre dolumu',
      });
      await sub.save();

      // Dealer'ı güncelle
      await Dealer.findByIdAndUpdate(sub.dealer._id, {
        subscriptionStatus: 'expired',
        activeSubscription: null,
      });

      console.log(`Abonelik süresi doldu: ${sub.dealer.name} (${sub._id})`);

      // Suresi doldu emaili gonder
      try {
        if (sub.dealer.contactEmail) {
          await emailService.sendSubscriptionExpiredEmail(sub.dealer, sub);
          console.log(`Suresi doldu emaili gonderildi: ${sub.dealer.contactEmail}`);
        }
      } catch (emailError) {
        console.error(`Email gonderme hatasi (${sub.dealer.name}):`, emailError.message);
      }
    }

    return expiredSubscriptions.length;
  } catch (error) {
    console.error('Abonelik süre kontrolü hatası:', error);
    throw error;
  }
}

/**
 * 2. Tüm aktif bayilerin kotalarını senkronize et
 */
async function syncAllQuotas() {
  console.log('\n=== Kota Senkronizasyonu ===');

  try {
    // Aktif aboneliği olan bayileri bul
    const dealers = await Dealer.find({
      subscriptionStatus: 'active',
    });

    console.log(`Aktif bayi sayısı: ${dealers.length}`);

    let syncCount = 0;
    for (const dealer of dealers) {
      try {
        const actualQuota = await quotaService.syncDealerQuota(dealer._id);
        await quotaService.syncAllCompanyQuotas(dealer._id);
        console.log(`Kota senkronize edildi: ${dealer.name} - Kullanılan: ${actualQuota}`);
        syncCount++;
      } catch (err) {
        console.error(`Kota senkronizasyonu hatası (${dealer.name}):`, err.message);
      }
    }

    return syncCount;
  } catch (error) {
    console.error('Kota senkronizasyonu hatası:', error);
    throw error;
  }
}

/**
 * 3. Süre dolmak üzere olan aboneliklere uyarı gönder
 * @param {number} daysBeforeExpiry - Kaç gün önce uyarı gönderilecek
 */
async function sendExpirationWarnings(daysBeforeExpiry = 7) {
  console.log('\n=== Süre Dolum Uyarıları ===');

  try {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysBeforeExpiry);

    // Süre dolmak üzere olan abonelikleri bul
    const expiringSubscriptions = await DealerSubscription.find({
      endDate: {
        $gte: new Date(),
        $lte: warningDate,
      },
      status: 'active',
    })
      .populate('dealer', 'name contactEmail')
      .populate('package', 'name');

    console.log(`Süre dolmak üzere olan abonelik sayısı: ${expiringSubscriptions.length}`);

    const warnings = [];
    for (const sub of expiringSubscriptions) {
      const daysRemaining = Math.ceil((sub.endDate - new Date()) / (1000 * 60 * 60 * 24));

      warnings.push({
        dealerId: sub.dealer._id,
        dealerName: sub.dealer.name,
        email: sub.dealer.contactEmail,
        packageName: sub.package?.name,
        expiresAt: sub.endDate,
        daysRemaining,
      });

      console.log(`Uyarı: ${sub.dealer.name} - ${daysRemaining} gün kaldı`);

      // Email gonder
      try {
        if (sub.dealer.contactEmail) {
          await emailService.sendSubscriptionExpiringEmail(sub.dealer, sub, daysRemaining);
          console.log(`Email gonderildi: ${sub.dealer.contactEmail}`);
        }
      } catch (emailError) {
        console.error(`Email gonderme hatasi (${sub.dealer.name}):`, emailError.message);
      }
    }

    return warnings;
  } catch (error) {
    console.error('Süre dolum uyarısı hatası:', error);
    throw error;
  }
}

/**
 * 4. Otomatik yenileme kontrolü (autoRenew=true olanlar için)
 */
async function processAutoRenewals() {
  console.log('\n=== Otomatik Yenileme Kontrolü ===');

  try {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Yarın süresi dolacak ve auto-renew açık olanları bul
    const autoRenewSubscriptions = await DealerSubscription.find({
      endDate: {
        $gte: now,
        $lte: tomorrow,
      },
      status: 'active',
      autoRenew: true,
    })
      .populate('dealer')
      .populate('package');

    console.log(`Otomatik yenilenecek abonelik sayısı: ${autoRenewSubscriptions.length}`);

    for (const sub of autoRenewSubscriptions) {
      console.log(`Otomatik yenileme: ${sub.dealer.name} - ${sub.package.name}`);

      // TODO: Ödeme entegrasyonu ile otomatik yenileme
      // Bu özellik iyzico'nun recurring payment özelliği ile entegre edilmeli
    }

    return autoRenewSubscriptions.length;
  } catch (error) {
    console.error('Otomatik yenileme hatası:', error);
    throw error;
  }
}

// ========================================
// ŞİRKET ABONELİK KONTROL FONKSİYONLARI
// ========================================

/**
 * 5. Süresi dolan şirket aboneliklerini kontrol et
 * - Süresi dolmuş: status -> 'pending_payment'
 * - 3 gün ödeme beklenir
 */
async function expireCompanySubscriptions() {
  console.log('\n=== Şirket Abonelik Süre Kontrolü ===');

  try {
    const now = new Date();

    // Süresi dolan aktif şirket abonelikleri bul (unlimited hariç)
    const expiredCompanies = await Company.find({
      'subscription.endDate': { $lt: now },
      'subscription.status': 'active',
      'subscription.billingType': { $ne: 'unlimited' },
    }).populate('dealer', 'name contactEmail');

    console.log(`Süresi dolan şirket aboneliği: ${expiredCompanies.length}`);

    let count = 0;
    for (const company of expiredCompanies) {
      // Status'u pending_payment yap (ödeme bekleniyor)
      company.subscription.status = 'pending_payment';
      company.subscription.history.push({
        action: 'expired',
        date: now,
        note: 'Abonelik süresi doldu, ödeme bekleniyor',
      });
      await company.save();

      console.log(`Şirket aboneliği süresi doldu: ${company.name}`);

      // Bayiye ve şirkete email gönder
      try {
        await emailService.sendCompanySubscriptionExpiredEmail(company, company.dealer);
        console.log(`Süre dolum emaili gönderildi: ${company.name}`);
      } catch (emailError) {
        console.error(`Email hatası (${company.name}):`, emailError.message);
      }

      count++;
    }

    return count;
  } catch (error) {
    console.error('Şirket abonelik süre kontrolü hatası:', error);
    throw error;
  }
}

/**
 * 6. Ödeme bekleyen şirketleri kontrol et ve askıya al
 * - 3 günden fazla pending_payment olan şirketler -> suspended
 */
async function suspendUnpaidCompanies() {
  console.log('\n=== Ödeme Bekleyen Şirket Kontrolü ===');

  try {
    const now = new Date();
    const gracePeriodDays = 3; // 3 gün ödeme bekleme süresi
    const suspendDate = new Date();
    suspendDate.setDate(suspendDate.getDate() - gracePeriodDays);

    // 3 günden fazla pending_payment olan şirketleri bul
    const unpaidCompanies = await Company.find({
      'subscription.status': 'pending_payment',
      'subscription.endDate': { $lt: suspendDate },
    }).populate('dealer', 'name contactEmail');

    console.log(`Askıya alınacak şirket: ${unpaidCompanies.length}`);

    let count = 0;
    for (const company of unpaidCompanies) {
      // Şirketi askıya al
      company.subscription.status = 'suspended';
      company.subscription.suspendedAt = now;
      company.isActive = false;

      company.subscription.history.push({
        action: 'suspended',
        date: now,
        note: 'Ödeme alınmadığı için otomatik askıya alındı',
      });

      await company.save();

      console.log(`Şirket askıya alındı: ${company.name}`);

      // Email gönder
      try {
        await emailService.sendCompanySubscriptionSuspendedEmail(company, company.dealer);
        console.log(`Askıya alma emaili gönderildi: ${company.name}`);
      } catch (emailError) {
        console.error(`Email hatası (${company.name}):`, emailError.message);
      }

      count++;
    }

    return count;
  } catch (error) {
    console.error('Ödeme bekleyen şirket kontrolü hatası:', error);
    throw error;
  }
}

/**
 * 7. Şirket abonelik süre dolum uyarıları gönder
 * @param {number} daysBeforeExpiry - Kaç gün önce uyarı gönderilecek
 */
async function sendCompanyExpirationWarnings(daysBeforeExpiry = 7) {
  console.log('\n=== Şirket Süre Dolum Uyarıları ===');

  try {
    const now = new Date();
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + daysBeforeExpiry);

    // Süre dolmak üzere olan şirket abonelikleri bul
    // Son 24 saat içinde uyarı gönderilmemiş olanlar
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const expiringCompanies = await Company.find({
      'subscription.endDate': {
        $gte: now,
        $lte: warningDate,
      },
      'subscription.status': 'active',
      'subscription.billingType': { $ne: 'unlimited' },
      $or: [
        { 'subscription.lastWarningAt': null },
        { 'subscription.lastWarningAt': { $lt: yesterday } },
      ],
    }).populate('dealer', 'name contactEmail');

    console.log(`Uyarı gönderilecek şirket: ${expiringCompanies.length}`);

    const warnings = [];
    for (const company of expiringCompanies) {
      const daysRemaining = Math.ceil((company.subscription.endDate - now) / (1000 * 60 * 60 * 24));

      warnings.push({
        companyId: company._id,
        companyName: company.name,
        dealerName: company.dealer?.name,
        email: company.contactEmail,
        expiresAt: company.subscription.endDate,
        daysRemaining,
        billingType: company.subscription.billingType,
      });

      console.log(
        `Uyarı: ${company.name} - ${daysRemaining} gün kaldı (${company.subscription.billingType})`
      );

      // Uyarı gönderildi olarak işaretle
      company.subscription.lastWarningAt = now;
      company.subscription.warningCount = (company.subscription.warningCount || 0) + 1;

      company.subscription.history.push({
        action: 'warning_sent',
        date: now,
        note: `${daysRemaining} gün kala uyarı gönderildi`,
      });

      await company.save();

      // Email gönder
      try {
        await emailService.sendCompanySubscriptionExpiringEmail(
          company,
          company.dealer,
          daysRemaining
        );
        console.log(`Uyarı emaili gönderildi: ${company.name}`);
      } catch (emailError) {
        console.error(`Email hatası (${company.name}):`, emailError.message);
      }
    }

    return warnings;
  } catch (error) {
    console.error('Şirket süre dolum uyarısı hatası:', error);
    throw error;
  }
}

/**
 * Tüm job'ları çalıştır
 */
async function runAllJobs() {
  console.log('================================================');
  console.log("Abonelik Job'ları Başlatılıyor...");
  console.log('Tarih:', new Date().toISOString());
  console.log('================================================');

  try {
    await connectDB();

    // === BAYİ ABONELİKLERİ ===
    // 1. Süresi dolmuş bayi abonelikleri kontrol et
    const expiredCount = await expireSubscriptions();

    // 2. Kotaları senkronize et
    const syncCount = await syncAllQuotas();

    // 3. Bayi süre dolum uyarıları gönder
    const warnings = await sendExpirationWarnings(7);

    // 4. Otomatik yenilemeleri kontrol et
    const autoRenewCount = await processAutoRenewals();

    // === ŞİRKET ABONELİKLERİ ===
    // 5. Süresi dolmuş şirket abonelikleri kontrol et
    const expiredCompanyCount = await expireCompanySubscriptions();

    // 6. Ödeme bekleyen şirketleri askıya al
    const suspendedCompanyCount = await suspendUnpaidCompanies();

    // 7. Şirket süre dolum uyarıları gönder (7 gün ve 3 gün kala)
    const companyWarnings7 = await sendCompanyExpirationWarnings(7);
    const companyWarnings3 = await sendCompanyExpirationWarnings(3);

    console.log('\n================================================');
    console.log("Job'lar Tamamlandı");
    console.log('--- BAYİ ABONELİKLERİ ---');
    console.log(`- Süresi dolan bayi: ${expiredCount}`);
    console.log(`- Senkronize edilen bayi: ${syncCount}`);
    console.log(`- Uyarı gönderilen bayi: ${warnings.length}`);
    console.log(`- Otomatik yenileme: ${autoRenewCount}`);
    console.log('--- ŞİRKET ABONELİKLERİ ---');
    console.log(`- Süresi dolan şirket: ${expiredCompanyCount}`);
    console.log(`- Askıya alınan şirket: ${suspendedCompanyCount}`);
    console.log(`- Uyarı gönderilen şirket (7 gün): ${companyWarnings7.length}`);
    console.log(`- Uyarı gönderilen şirket (3 gün): ${companyWarnings3.length}`);
    console.log('================================================');

    return {
      // Bayi
      expiredCount,
      syncCount,
      warningCount: warnings.length,
      autoRenewCount,
      // Şirket
      expiredCompanyCount,
      suspendedCompanyCount,
      companyWarningCount: companyWarnings7.length + companyWarnings3.length,
    };
  } catch (error) {
    console.error('Job hatası:', error);
    throw error;
  }
}

// Script doğrudan çalıştırılıyorsa
if (require.main === module) {
  runAllJobs()
    .then(() => {
      console.log("\nJob'lar başarıyla tamamlandı");
      process.exit(0);
    })
    .catch(error => {
      console.error('\nJob hatası:', error);
      process.exit(1);
    });
}

module.exports = {
  // Bayi abonelikleri
  expireSubscriptions,
  syncAllQuotas,
  sendExpirationWarnings,
  processAutoRenewals,
  // Şirket abonelikleri
  expireCompanySubscriptions,
  suspendUnpaidCompanies,
  sendCompanyExpirationWarnings,
  // Tümü
  runAllJobs,
};
