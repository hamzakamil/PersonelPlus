const Settings = require('../models/Settings');

/**
 * Belirli bir yıl için asgari ücret değerini getirir (Global ayarlardan)
 * @param {Number} year - Yıl (opsiyonel, belirtilmezse mevcut yıl)
 * @param {String} type - 'NET' veya 'BRUT' (opsiyonel, varsayılan NET)
 * @returns {Promise<Number>} Asgari ücret değeri
 */
async function getMinimumWage(year = null, type = 'NET') {
  try {
    // Global ayarlardan al
    const targetYear = year || new Date().getFullYear();
    const wageData = await Settings.getMinimumWage(targetYear);

    // Tip belirtilmemişse varsayılan olarak NET kullan
    const wageType = type || 'NET';
    return wageType === 'NET' ? wageData.net : wageData.brut;
  } catch (error) {
    console.error('Asgari ücret getirme hatası:', error);
    // Hata durumunda varsayılan değer (2026 net asgari ücret)
    return 28007.50;
  }
}

/**
 * Belirli bir yıl için hem net hem brüt asgari ücret değerlerini getirir
 * @param {Number} year - Yıl (opsiyonel)
 * @returns {Promise<Object>} { net: Number, brut: Number, year: Number }
 */
async function getMinimumWageBoth(year = null) {
  try {
    // Global ayarlardan al
    const targetYear = year || new Date().getFullYear();
    const wageData = await Settings.getMinimumWage(targetYear);

    return {
      net: wageData.net,
      brut: wageData.brut,
      year: wageData.year
    };
  } catch (error) {
    console.error('Asgari ücret getirme hatası:', error);
    // Hata durumunda varsayılan değerler (2026)
    return {
      net: 28007.50,
      brut: 33030.00,
      year: year || new Date().getFullYear()
    };
  }
}

module.exports = {
  getMinimumWage,
  getMinimumWageBoth
};
