/**
 * SMS Yapılandırması - Verimor API
 * Dokümantasyon: https://developer.verimor.com.tr/smsapi
 */

module.exports = {
  // Verimor API Ayarları
  verimor: {
    apiUrl: process.env.VERIMOR_API_URL || 'https://api.verimor.com.tr/v2',
    username: process.env.VERIMOR_USERNAME,
    password: process.env.VERIMOR_PASSWORD,
    sourceAddr: process.env.VERIMOR_SOURCE_ADDR || 'PersonelPlus',
    // Karakter kodlaması: 0=GSM, 1=Türkçe, 2=Unicode
    datacoding: 1,
    // Timeout (ms)
    timeout: 30000,
    // Retry ayarları
    retryCount: 3,
    retryDelay: 1000,
  },

  // OTP Ayarları
  otp: {
    // Kod uzunluğu
    length: 6,
    // Geçerlilik süresi (dakika)
    expiresInMinutes: 5,
    // Maksimum deneme hakkı
    maxAttempts: 3,
    // Rate limiting (saniye) - aynı numara için minimum bekleme
    rateLimitSeconds: 60,
  },

  // SMS Şablonları
  templates: {
    // Bordro onay kodu
    bordroApproval: (code, month, year) =>
      `PersonelPlus - Bordro Onay Kodu: ${code}\n${month}/${year} donemi bordronuzu onaylamak icin bu kodu kullanin.\nGecerlilik: 5 dakika`,

    // İzin kabul kodu
    leaveAcceptance: (code, startDate, endDate, days) =>
      `PersonelPlus - Izin Kabul Kodu: ${code}\n${startDate} - ${endDate} tarihleri arasi ${days} gunluk izniniz onaylandi.\nKabul etmek icin bu kodu kullanin.\nGecerlilik: 5 dakika`,

    // Genel OTP
    genericOtp: code => `PersonelPlus - Dogrulama Kodu: ${code}\nGecerlilik: 5 dakika`,
  },

  // Geliştirme modu
  development: {
    // Test modunda gerçek SMS gönderme
    enabled: process.env.NODE_ENV !== 'production',
    // Mock SMS (gerçek API çağrısı yapmadan)
    mockSms: process.env.SMS_MOCK === 'true',
    // Test telefon numaraları (mock modda bu numaralara "gönderilmiş" sayılır)
    testPhones: ['05001234567', '05009876543'],
  },
};
