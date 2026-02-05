/**
 * Abonelik Cron Jobs
 *
 * Günlük çalışan job'lar:
 * 1. Süresi dolan abonelikleri "expired" yap
 * 2. Kota senkronizasyonu
 * 3. Süre dolmak üzere olan aboneliklere uyarı maili gönder
 *
 * Kullanım:
 * - Standalone: node jobs/subscriptionJobs.js
 * - Veya: server.js'de cron job olarak schedule edilebilir
 */

require('dotenv').config();
const mongoose = require('mongoose');
const DealerSubscription = require('../models/DealerSubscription');
const Dealer = require('../models/Dealer');
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
      status: 'active'
    }).populate('dealer', 'name contactEmail');

    console.log(`Süresi dolan abonelik sayısı: ${expiredSubscriptions.length}`);

    for (const sub of expiredSubscriptions) {
      // Aboneliği expired yap
      sub.status = 'expired';
      sub.history.push({
        action: 'expired',
        date: now,
        note: 'Otomatik süre dolumu'
      });
      await sub.save();

      // Dealer'ı güncelle
      await Dealer.findByIdAndUpdate(sub.dealer._id, {
        subscriptionStatus: 'expired',
        activeSubscription: null
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
      subscriptionStatus: 'active'
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
        $lte: warningDate
      },
      status: 'active'
    }).populate('dealer', 'name contactEmail')
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
        daysRemaining
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
        $lte: tomorrow
      },
      status: 'active',
      autoRenew: true
    }).populate('dealer')
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

/**
 * Tüm job'ları çalıştır
 */
async function runAllJobs() {
  console.log('================================================');
  console.log('Abonelik Job\'ları Başlatılıyor...');
  console.log('Tarih:', new Date().toISOString());
  console.log('================================================');

  try {
    await connectDB();

    // 1. Süresi dolmuş abonelikleri kontrol et
    const expiredCount = await expireSubscriptions();

    // 2. Kotaları senkronize et
    const syncCount = await syncAllQuotas();

    // 3. Süre dolum uyarıları gönder
    const warnings = await sendExpirationWarnings(7);

    // 4. Otomatik yenilemeleri kontrol et
    const autoRenewCount = await processAutoRenewals();

    console.log('\n================================================');
    console.log('Job\'lar Tamamlandı');
    console.log(`- Süresi dolan abonelik: ${expiredCount}`);
    console.log(`- Senkronize edilen bayi: ${syncCount}`);
    console.log(`- Uyarı gönderilen: ${warnings.length}`);
    console.log(`- Otomatik yenileme: ${autoRenewCount}`);
    console.log('================================================');

    return {
      expiredCount,
      syncCount,
      warningCount: warnings.length,
      autoRenewCount
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
      console.log('\nJob\'lar başarıyla tamamlandı');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nJob hatası:', error);
      process.exit(1);
    });
}

module.exports = {
  expireSubscriptions,
  syncAllQuotas,
  sendExpirationWarnings,
  processAutoRenewals,
  runAllJobs
};
