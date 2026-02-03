/**
 * Telefon Numarası Yardımcı Fonksiyonları
 *
 * Türk cep telefonu numaralarını normalize eder ve doğrular.
 * Desteklenen giriş formatları:
 * - 05XX XXX XX XX
 * - 5XX XXX XX XX
 * - +90 5XX XXX XX XX
 * - 905XXXXXXXX
 * - Boşluklu, tireli veya parantezsiz her format
 *
 * Standart çıktı formatı: 05XXXXXXXXX (11 hane, sadece rakam)
 */

/**
 * Telefon numarasını normalize eder
 * @param {string} input - Ham telefon numarası girişi
 * @returns {string} - Normalize edilmiş numara (05XXXXXXXXX) veya boş string
 */
function normalizePhone(input) {
  if (!input || typeof input !== 'string') return '';

  // 1. Tüm non-digit karakterleri temizle
  let digits = input.replace(/\D/g, '');

  // 2. Boşsa dön
  if (!digits) return '';

  // 3. Türkiye kodu (+90 veya 90) prefix'i varsa kaldır
  // 90 ile başlıyorsa ve 12 hane veya daha fazlaysa
  if (digits.startsWith('90') && digits.length >= 12) {
    digits = digits.substring(2);
  }

  // 4. 5 ile başlıyorsa (0 olmadan) başına 0 ekle
  if (digits.startsWith('5') && !digits.startsWith('05')) {
    digits = '0' + digits;
  }

  // 5. 05 ile başlıyorsa ilk 11 haneyi al
  if (digits.startsWith('05')) {
    digits = digits.substring(0, 11);
  }

  // 6. Geçerli format kontrolü - 05 ile başlamalı
  if (!digits.startsWith('05')) {
    // Geçersiz format, ama yine de temizlenmiş değeri dön
    return digits.substring(0, 11);
  }

  return digits;
}

/**
 * Telefon numarasının geçerli Türk cep telefonu olup olmadığını kontrol eder
 * @param {string} phone - Telefon numarası (normalize edilmiş veya ham)
 * @returns {boolean} - Geçerliyse true
 */
function isValidTurkishPhone(phone) {
  if (!phone) return false;

  const normalized = normalizePhone(phone);

  // 11 hane olmalı ve 05 ile başlamalı
  if (normalized.length !== 11) return false;
  if (!normalized.startsWith('05')) return false;

  // Geçerli operatör kodları: 530-539, 540-549, 550-559, 560-569,
  // 500-509, 510-519, 520-529 (ve diğerleri)
  // Basit kontrol: 05XX formatında olmalı
  const operatorCode = normalized.substring(2, 3);
  const validOperatorFirstDigits = ['3', '4', '5', '0', '1', '2', '6', '7', '8', '9'];

  return validOperatorFirstDigits.includes(operatorCode);
}

/**
 * Telefon numarasını görsel formata çevirir
 * @param {string} phone - Normalize edilmiş telefon numarası
 * @returns {string} - Formatlanmış numara (05XX XXX XX XX)
 */
function formatPhone(phone) {
  const normalized = normalizePhone(phone);

  if (!normalized || normalized.length < 4) return normalized;

  // Format: 05XX XXX XX XX
  let formatted = normalized.substring(0, 4);

  if (normalized.length > 4) {
    formatted += ' ' + normalized.substring(4, 7);
  }
  if (normalized.length > 7) {
    formatted += ' ' + normalized.substring(7, 9);
  }
  if (normalized.length > 9) {
    formatted += ' ' + normalized.substring(9, 11);
  }

  return formatted;
}

/**
 * Telefon numarasını uluslararası formata çevirir
 * @param {string} phone - Normalize edilmiş telefon numarası
 * @returns {string} - Uluslararası format (+90 5XX XXX XX XX)
 */
function toInternationalFormat(phone) {
  const normalized = normalizePhone(phone);

  if (!normalized || normalized.length !== 11) return normalized;

  // +90 5XX XXX XX XX formatı
  const withoutLeadingZero = normalized.substring(1); // 5XXXXXXXXX
  return '+90 ' + formatPhone('0' + withoutLeadingZero).substring(1);
}

/**
 * Mongoose middleware için telefon normalize fonksiyonu
 * Model'de pre-save hook olarak kullanılabilir
 * @param {object} doc - Mongoose document
 * @param {string} fieldName - Telefon alanının adı
 */
function normalizePhoneField(doc, fieldName = 'phone') {
  if (doc[fieldName]) {
    doc[fieldName] = normalizePhone(doc[fieldName]);
  }
}

/**
 * Express middleware - request body'deki telefon alanlarını normalize eder
 * @param {string[]} fields - Normalize edilecek alan adları
 */
function normalizePhoneMiddleware(fields = ['phone']) {
  return (req, res, next) => {
    if (req.body) {
      for (const field of fields) {
        if (req.body[field]) {
          req.body[field] = normalizePhone(req.body[field]);
        }
      }
    }
    next();
  };
}

module.exports = {
  normalizePhone,
  isValidTurkishPhone,
  formatPhone,
  toInternationalFormat,
  normalizePhoneField,
  normalizePhoneMiddleware
};
