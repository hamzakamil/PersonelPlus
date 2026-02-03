const WorkingPermit = require('../models/WorkingPermit');

/**
 * Yeni şirket oluşturulduğunda varsayılan izin türlerini oluşturur
 * @param {String} companyId - Şirket ID'si
 */
async function initializeDefaultPermits(companyId) {
  try {
    // Ana kategori izinler
    const mainPermits = [
      {
        name: 'Yıllık izin (Ücretli İzin)',
        description: 'Yıllık ücretli izin',
        isDefault: true,
        company: companyId,
        createdBy: 'company',
        parentPermitId: null
      },
      {
        name: 'Hastalık izni (Rapor İzni)',
        description: 'Hastalık raporu ile alınan izin',
        isDefault: true,
        company: companyId,
        createdBy: 'company',
        parentPermitId: null
      },
      {
        name: 'Mazeret izni (Ücretsiz İzin)',
        description: 'Ücretsiz mazeret izni',
        isDefault: true,
        company: companyId,
        createdBy: 'company',
        parentPermitId: null
      },
      {
        name: 'Saatlik İzin',
        description: 'Saatlik izin',
        isDefault: true,
        company: companyId,
        createdBy: 'company',
        parentPermitId: null
      },
      {
        name: 'Diğer izinler',
        description: 'Diğer izin türleri',
        isDefault: true,
        company: companyId,
        createdBy: 'company',
        parentPermitId: null
      }
    ];

    // Ana kategorileri oluştur
    const createdPermits = await WorkingPermit.insertMany(mainPermits);

    // "Diğer izinler" ana kategorisini bul
    const digerIzinler = createdPermits.find(p => p.name === 'Diğer izinler');

    if (digerIzinler) {
      // Alt kategori izinler
      const subPermits = [
        {
          name: 'Babalık izni',
          description: 'Babalık izni',
          isDefault: true,
          company: companyId,
          createdBy: 'company',
          parentPermitId: digerIzinler._id
        },
        {
          name: 'Evlilik izni',
          description: 'Evlilik izni',
          isDefault: true,
          company: companyId,
          createdBy: 'company',
          parentPermitId: digerIzinler._id
        },
        {
          name: 'Ölüm izni',
          description: 'Ölüm izni',
          isDefault: true,
          company: companyId,
          createdBy: 'company',
          parentPermitId: digerIzinler._id
        },
        {
          name: 'Doğum izni',
          description: 'Doğum izni',
          isDefault: true,
          company: companyId,
          createdBy: 'company',
          parentPermitId: digerIzinler._id
        }
      ];

      // Alt kategorileri oluştur
      await WorkingPermit.insertMany(subPermits);
    }

    return { success: true, message: 'Varsayılan izin türleri oluşturuldu' };
  } catch (error) {
    console.error('Varsayılan izin türleri oluşturulurken hata:', error);
    throw error;
  }
}

module.exports = {
  initializeDefaultPermits
};




