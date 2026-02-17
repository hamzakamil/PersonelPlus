/**
 * Display-only formatters
 *
 * Bu dosya sadece görüntüleme (display) için kullanılan formatlama fonksiyonlarını içerir.
 * Input formatlaması için ilgili component'leri kullanın (örn: PhoneInput.vue)
 */

/**
 * Telefon numarasını görsel formata çevirir (display-only)
 * Giriş formatları: 05XXXXXXXXX, 5XXXXXXXXX, +905XXXXXXXXX, 0XXX XXX XX XX
 * Çıkış formatı: 05XX XXX XX XX
 *
 * @param {string} phone - Ham telefon numarası
 * @returns {string} Formatlanmış telefon numarası
 *
 * @example
 * formatPhone('05551234567')    // '0555 123 45 67'
 * formatPhone('5551234567')     // '0555 123 45 67'
 * formatPhone('+905551234567')  // '0555 123 45 67'
 * formatPhone('0555 123 45 67') // '0555 123 45 67'
 */
export const formatPhone = (phone) => {
  if (!phone) return '';

  // 1. Tüm non-digit karakterleri temizle
  let digits = phone.replace(/\D/g, '');

  if (!digits) return '';

  // 2. +90 veya 90 prefix'i varsa kaldır (Türkiye kodu)
  if (digits.startsWith('90') && digits.length >= 12) {
    digits = digits.substring(2);
  }

  // 3. 5 ile başlıyorsa başına 0 ekle
  if (digits.startsWith('5') && !digits.startsWith('05')) {
    digits = '0' + digits;
  }

  // 4. İlk 11 haneyi al (05XXXXXXXXX)
  digits = digits.substring(0, 11);

  // 5. Formatlama: 05XX XXX XX XX
  let formatted = '';

  if (digits.length > 0) {
    formatted = digits.substring(0, 4); // 05XX
  }
  if (digits.length > 4) {
    formatted += ' ' + digits.substring(4, 7); // XXX
  }
  if (digits.length > 7) {
    formatted += ' ' + digits.substring(7, 9); // XX
  }
  if (digits.length > 9) {
    formatted += ' ' + digits.substring(9, 11); // XX
  }

  return formatted;
};

/**
 * Para birimini Türk Lirası olarak formatlar
 *
 * @param {number} value - Formatlanacak tutar
 * @param {object} options - Intl.NumberFormat seçenekleri
 * @returns {string} Formatlanmış para birimi
 *
 * @example
 * formatCurrency(1234.56)        // '1.234,56 ₺'
 * formatCurrency(1000, { minimumFractionDigits: 0 }) // '1.000 ₺'
 */
export const formatCurrency = (value, options = {}) => {
  const defaultOptions = {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat('tr-TR', { ...defaultOptions, ...options }).format(value || 0);
};

/**
 * Tarihi Türk yerel formatına göre formatlar
 *
 * @param {Date|string} date - Formatlanacak tarih
 * @param {object} options - Intl.DateTimeFormat seçenekleri
 * @returns {string} Formatlanmış tarih
 *
 * @example
 * formatDate(new Date('2026-02-15'))  // '15.02.2026'
 * formatDate('2026-02-15T10:30:00')   // '15.02.2026'
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '-';

  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  return new Date(date).toLocaleDateString('tr-TR', { ...defaultOptions, ...options });
};

/**
 * Tarih ve saati Türk yerel formatına göre formatlar
 *
 * @param {Date|string} date - Formatlanacak tarih/saat
 * @param {object} options - Intl.DateTimeFormat seçenekleri
 * @returns {string} Formatlanmış tarih ve saat
 *
 * @example
 * formatDateTime(new Date('2026-02-15T10:30:00'))  // '15.02.2026 10:30:00'
 */
export const formatDateTime = (date, options = {}) => {
  if (!date) return '-';

  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  return new Date(date).toLocaleString('tr-TR', { ...defaultOptions, ...options });
};

/**
 * Sayıyı Türk yerel formatına göre formatlar (binlik ayırıcı ile)
 *
 * @param {number} value - Formatlanacak sayı
 * @param {number} decimals - Ondalık basamak sayısı (varsayılan: 0)
 * @returns {string} Formatlanmış sayı
 *
 * @example
 * formatNumber(1234567)      // '1.234.567'
 * formatNumber(1234.56, 2)   // '1.234,56'
 */
export const formatNumber = (value, decimals = 0) => {
  if (value == null) return '-';

  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};
