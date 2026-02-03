const mongoose = require('mongoose');
const AdditionalPaymentType = require('../models/AdditionalPaymentType');
require('dotenv').config();

// Varsayılan ödeme türleri
const defaultPaymentTypes = [
  {
    name: 'Yol Kazancı',
    code: 'YOL',
    description: 'Çalışana verilen ulaşım desteği',
    category: 'TRANSPORTATION',
    paymentFrequency: 'MONTHLY',
    isTaxExempt: true,
    taxExemptLimit: 5000,
    isDefault: true,
    displayOrder: 1,
    // Yol için özel ödeme yöntemleri
    hasPaymentMethodOptions: true,
    paymentMethodOptions: [
      {
        code: 'SUBSCRIPTION',
        name: 'Abonman ile yapıyorum',
        description: 'Bu durumda Yol ücretinin günlük limit kadar kesimi SGK ve Vergiden muaf olacaktır. Ayrıca Yol Kesintisi otomatik tanımlanarak Yol ücretinin net tutarı kadar olan kesim bordro net tutarını değiştirmeyecek şekilde uygulanacaktır. KDV Dahil seçilirse Vergi İstisna Tutarı limit+KDV kadar yapılacaktır.',
        hasSgkDeduction: false,
        hasVatDeduction: false
      },
      {
        code: 'CASH',
        name: 'Nakit ile yapıyorum',
        description: 'Bu durumda Yol ücretinin tamamında SGK ve Vergi kesintisi yapılır. Herhangi bir muafiyet uygulanmaz. Bordroda ödemenin Net kesimi kadar ödenen tutar artar. KDV Dahil olup olmaması herhangi bir hesaplamayı değiştirmez.',
        hasSgkDeduction: true,
        hasVatDeduction: true
      }
    ]
  },
  {
    name: 'Yemek Kazancı',
    code: 'YEMEK',
    description: 'Çalışana verilen yemek desteği',
    category: 'FOOD',
    paymentFrequency: 'MONTHLY',
    isTaxExempt: true,
    taxExemptLimit: 5000,
    isDefault: true,
    displayOrder: 2,
    // Yemek için özel ödeme yöntemleri
    hasPaymentMethodOptions: true,
    paymentMethodOptions: [
      {
        code: 'CASH',
        name: 'Maaşa nakit olarak ekleniyor',
        description: 'SGK ve Vergi kesintisi işaretlenir. SGK limit üstü "SGK", Vergi limit üstü "Vergi" kesintisi yapılır.',
        hasSgkDeduction: true,
        hasVatDeduction: true
      },
      {
        code: 'MEAL_CARD_ONLY',
        name: 'Sadece yemek kartı veya çek ile yapılıyor',
        description: 'SGK işareti kaldırılır ve SGK Matrahına eklenmez. Vergi limit üstü "Vergi" kesintisi yapılır. Otomatik olarak "Yemek Kesinti" adı ile kesinti tanımlanarak Net Ödenen maaş tutarının değişmemesi sağlanır.',
        hasSgkDeduction: false,
        hasVatDeduction: true
      },
      {
        code: 'NON_MEAL_CARD',
        name: 'Sadece yemek için kullanılmayan yemek kartı veya çek ile yapılıyor',
        description: 'SGK ve Vergi kesintisi işaretlenir. SGK limit üstü "SGK", Vergi limit üstü "Vergi" kesintisi yapılır. Otomatik olarak "Yemek Kesinti" adı ile kesinti tanımlanarak Net Ödenen maaş tutarının değişmemesi sağlanır.',
        hasSgkDeduction: true,
        hasVatDeduction: true
      }
    ]
  },
  {
    name: 'Servis',
    code: 'SERVIS',
    description: 'Şirket servisi kullanım bedeli',
    category: 'TRANSPORTATION',
    paymentFrequency: 'MONTHLY',
    isTaxExempt: false,
    taxExemptLimit: 0,
    isDefault: true,
    displayOrder: 3
  },
  {
    name: 'Giyim Yardımı',
    code: 'GIYIM',
    description: 'Çalışana verilen giyim desteği',
    category: 'CLOTHING',
    paymentFrequency: 'YEARLY',
    isTaxExempt: false,
    taxExemptLimit: 0,
    isDefault: true,
    displayOrder: 4
  },
  {
    name: 'Aile Yardımı',
    code: 'AILE',
    description: 'Evli çalışanlara verilen aile desteği',
    category: 'FAMILY',
    paymentFrequency: 'MONTHLY',
    isTaxExempt: false,
    taxExemptLimit: 0,
    isDefault: true,
    displayOrder: 5
  },
  {
    name: 'Çocuk Yardımı',
    code: 'COCUK',
    description: 'Çocuklu çalışanlara verilen destek',
    category: 'FAMILY',
    paymentFrequency: 'MONTHLY',
    isTaxExempt: true,
    taxExemptLimit: 1000,
    isDefault: true,
    displayOrder: 6
  },
  {
    name: 'Evlenme Yardımı',
    code: 'EVLENME',
    description: 'Evlenen çalışana verilen tek seferlik destek',
    category: 'FAMILY',
    paymentFrequency: 'ONE_TIME',
    isTaxExempt: false,
    taxExemptLimit: 0,
    isDefault: true,
    displayOrder: 7
  },
  {
    name: 'Doğum Yardımı',
    code: 'DOGUM',
    description: 'Çocuğu olan çalışana verilen tek seferlik destek',
    category: 'FAMILY',
    paymentFrequency: 'ONE_TIME',
    isTaxExempt: false,
    taxExemptLimit: 0,
    isDefault: true,
    displayOrder: 8
  },
  {
    name: 'Prim',
    code: 'PRIM',
    description: 'Performansa dayalı prim ödemesi',
    category: 'BONUS',
    paymentFrequency: 'MONTHLY',
    isTaxExempt: false,
    taxExemptLimit: 0,
    isDefault: true,
    displayOrder: 9
  },
  {
    name: 'İkramiye',
    code: 'IKRAMIYE',
    description: 'Dönemsel ikramiye ödemesi',
    category: 'BONUS',
    paymentFrequency: 'YEARLY',
    isTaxExempt: false,
    taxExemptLimit: 0,
    isDefault: true,
    displayOrder: 10
  }
];

/**
 * Varsayılan ödeme türlerini oluşturur veya günceller
 */
async function initializeAdditionalPaymentTypes() {
  try {
    console.log('Varsayılan ödeme türleri kontrol ediliyor...');

    for (const typeData of defaultPaymentTypes) {
      // Mevcut kaydı kontrol et
      const existing = await AdditionalPaymentType.findOne({ code: typeData.code });

      if (existing) {
        // Mevcut kaydı güncelle (özellikle paymentMethodOptions için)
        const needsUpdate = typeData.hasPaymentMethodOptions &&
          (!existing.paymentMethodOptions || existing.paymentMethodOptions.length === 0);

        if (needsUpdate || existing.name !== typeData.name) {
          await AdditionalPaymentType.updateOne(
            { code: typeData.code },
            {
              $set: {
                name: typeData.name,
                hasPaymentMethodOptions: typeData.hasPaymentMethodOptions || false,
                paymentMethodOptions: typeData.paymentMethodOptions || []
              }
            }
          );
          console.log(`  ↻ "${typeData.name}" (${typeData.code}) güncellendi`);
        } else {
          console.log(`  ✓ "${typeData.name}" (${typeData.code}) zaten mevcut`);
        }
      } else {
        // Yeni kayıt oluştur
        await AdditionalPaymentType.create(typeData);
        console.log(`  + "${typeData.name}" (${typeData.code}) oluşturuldu`);
      }
    }

    console.log('\nVarsayılan ödeme türleri başarıyla kontrol edildi.');
    return { success: true, message: 'Ödeme türleri hazır' };

  } catch (error) {
    console.error('Ödeme türleri oluşturulurken hata:', error);
    throw error;
  }
}

// Doğrudan çalıştırılırsa
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pys';

  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('MongoDB bağlantısı başarılı\n');
      await initializeAdditionalPaymentTypes();
      process.exit(0);
    })
    .catch(err => {
      console.error('MongoDB bağlantı hatası:', err);
      process.exit(1);
    });
}

module.exports = { initializeAdditionalPaymentTypes, defaultPaymentTypes };
