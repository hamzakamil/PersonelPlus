const WhatsAppSettings = require('../models/WhatsAppSettings');

/**
 * WhatsApp Entegrasyon Servisi
 * 
 * NOT: sendMessage() fonksiyonu şimdilik aktif değil.
 * Gelecekte bu fonksiyon tetiklenebilir hale getirilecek.
 */

/**
 * API credentials doğrulama
 * @param {Object} settings - WhatsAppSettings model instance
 * @returns {Promise<boolean>}
 */
async function validateCredentials(settings) {
  try {
    // Şimdilik sadece format kontrolü yapılıyor
    // Gelecekte gerçek API çağrısı yapılabilir
    
    if (!settings.apiKey || !settings.whatsappBusinessNumber) {
      return false;
    }

    // API key'i çöz (şifrelenmişse)
    const decryptedKey = decrypt(settings.apiKey) || settings.apiKey;

    // Telefon numarası format kontrolü
    const phoneRegex = /^\+90\s?[0-9]{3}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/;
    if (!phoneRegex.test(settings.whatsappBusinessNumber)) {
      return false;
    }

    // API key format kontrolü (provider'a göre)
    if (settings.apiProvider === 'Meta Cloud API') {
      // Meta Cloud API token formatı genellikle uzun bir string
      if (decryptedKey.length < 10) {
        return false;
      }
    } else if (settings.apiProvider === 'Twilio') {
      // Twilio format kontrolü
      if (decryptedKey.length < 20) {
        return false;
      }
    }

    // TODO: Gerçek API çağrısı yapılabilir
    // const isValid = await testApiConnection(settings, decryptedKey);
    // return isValid;

    return true;
  } catch (error) {
    console.error('Credential doğrulama hatası:', error);
    return false;
  }
}

/**
 * Mesaj şablonunu hazırla (değişkenleri değiştir)
 * @param {string} eventType - Olay tipi (onEmployeeOnboarding, onLeaveApproved, vb.)
 * @param {Object} variables - Değişkenler ({employeeName, companyName, vb.})
 * @param {string} companyId - Şirket ID
 * @returns {Promise<string>} Hazırlanmış mesaj
 */
async function prepareMessageTemplate(eventType, variables = {}, companyId = null) {
  try {
    let template = null;

    // Şirket bazlı şablon varsa onu kullan
    if (companyId) {
      const settings = await WhatsAppSettings.findOne({ company: companyId });
      if (settings && settings.messageTemplates && settings.messageTemplates[eventType]) {
        template = settings.messageTemplates[eventType];
      }
    }

    // Şablon bulunamazsa varsayılan şablonu kullan
    if (!template) {
      const defaultTemplates = getDefaultTemplates();
      template = defaultTemplates[eventType] || '';
    }

    // Değişkenleri değiştir
    let message = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      message = message.replace(regex, variables[key] || '');
    });

    // Kalan {variable} ifadelerini temizle (opsiyonel)
    message = message.replace(/\{[^}]+\}/g, '');

    return message;
  } catch (error) {
    console.error('Mesaj şablonu hazırlama hatası:', error);
    return '';
  }
}

/**
 * Varsayılan mesaj şablonları
 * @returns {Object}
 */
function getDefaultTemplates() {
  return {
    onEmployeeOnboarding: 'Sayın {employeeName}, {companyName} şirketine hoş geldiniz! İşe giriş tarihiniz: {hireDate}',
    onEmployeeOffboarding: 'Sayın {employeeName}, {companyName} şirketinden ayrılışınız {exitDate} tarihinde gerçekleşmiştir.',
    onLeaveRequestSubmitted: 'Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz alınmıştır. Onay sürecinde bilgilendirileceksiniz.',
    onLeaveApproved: 'Sayın {employeeName}, {startDate} - {endDate} tarihleri arasındaki izin talebiniz onaylanmıştır.',
    onLeaveRejected: 'Sayın {employeeName}, {reason} nedeniyle {startDate} - {endDate} tarihleri arasındaki izin talebiniz reddedilmiştir.'
  };
}

/**
 * Şirket WhatsApp ayarlarını getir
 * @param {string} companyId - Şirket ID
 * @returns {Promise<Object|null>}
 */
async function getSettingsByCompany(companyId) {
  try {
    const settings = await WhatsAppSettings.findOne({ company: companyId });
    return settings;
  } catch (error) {
    console.error('WhatsApp ayarları getirme hatası:', error);
    return null;
  }
}

/**
 * WhatsApp mesajı gönder
 * 
 * ⚠️ NOT: Bu fonksiyon şimdilik aktif değil!
 * Gelecekte bu fonksiyon tetiklenebilir hale getirilecek.
 * 
 * @param {string} companyId - Şirket ID
 * @param {string} phoneNumber - Alıcı telefon numarası
 * @param {string} message - Gönderilecek mesaj
 * @returns {Promise<Object>}
 */
async function sendMessage(companyId, phoneNumber, message) {
  // TODO: Bu fonksiyon gelecekte aktif edilecek
  // Şimdilik sadece log tutuluyor
  
  console.log('[WhatsApp Service] sendMessage çağrıldı (henüz aktif değil)');
  console.log('Company ID:', companyId);
  console.log('Phone:', phoneNumber);
  console.log('Message:', message);

  // Settings kontrolü
  const settings = await getSettingsByCompany(companyId);
  if (!settings || !settings.isActive) {
    return {
      success: false,
      message: 'WhatsApp entegrasyonu aktif değil veya ayarlanmamış'
    };
  }

  // TODO: Gerçek API çağrısı yapılacak
  // const result = await callWhatsAppAPI(settings, phoneNumber, message);
  // return result;

  return {
    success: false,
    message: 'WhatsApp mesaj gönderimi henüz aktif değil'
  };
}

module.exports = {
  validateCredentials,
  prepareMessageTemplate,
  getDefaultTemplates,
  getSettingsByCompany,
  sendMessage // Şimdilik aktif değil
};

