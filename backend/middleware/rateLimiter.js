/**
 * Rate Limiting Middleware
 * API isteklerini sınırlar, DDoS ve brute force saldırılarını önler
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

/**
 * Genel API Rate Limiter
 * Tüm API endpoint'leri için genel sınırlama
 */
const isDev = process.env.NODE_ENV !== 'production';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: isDev ? 1000 : 100, // Geliştirmede 1000, production'da 100
  message: {
    success: false,
    message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin',
    errorCode: 'TOO_MANY_REQUESTS',
  },
  standardHeaders: true, // `RateLimit-*` header'ları ekle
  legacyHeaders: false, // `X-RateLimit-*` header'larını devre dışı bırak
  // Belirli endpoint'leri atla
  skip: req => {
    // Health check endpoint'lerini atla
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * Strict Rate Limiter (Login, Register gibi hassas işlemler için)
 * Brute force saldırılarını önler
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: isDev ? 50 : 5, // Geliştirmede 50, production'da 5
  message: {
    success: false,
    message: 'Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.',
    errorCode: 'TOO_MANY_LOGIN_ATTEMPTS',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Başarılı login'de counter'ı sıfırla
  skipSuccessfulRequests: true,
  // Failed request'lerde de sayılsın
  skipFailedRequests: false,
});

/**
 * Create Account Limiter
 * Spam hesap oluşturmayı önler
 */
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: isDev ? 30 : 3, // Geliştirmede 30, production'da 3
  message: {
    success: false,
    message: 'Çok fazla hesap oluşturma denemesi. 1 saat sonra tekrar deneyin.',
    errorCode: 'TOO_MANY_ACCOUNT_CREATIONS',
  },
});

/**
 * File Upload Limiter
 * Dosya yükleme isteklerini sınırlar
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 50, // IP başına maksimum 50 upload
  message: {
    success: false,
    message: 'Çok fazla dosya yükleme işlemi. 1 saat sonra tekrar deneyin.',
    errorCode: 'TOO_MANY_UPLOADS',
  },
});

/**
 * Password Reset Limiter
 * Şifre sıfırlama isteklerini sınırlar
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 saat
  max: 3, // IP başına maksimum 3 şifre sıfırlama
  message: {
    success: false,
    message: 'Çok fazla şifre sıfırlama talebi. 1 saat sonra tekrar deneyin.',
    errorCode: 'TOO_MANY_PASSWORD_RESETS',
  },
});

/**
 * Redis ile Rate Limiting (Production için önerilir)
 *
 * Redis kurulumu:
 * 1. Redis'i yükle ve başlat
 * 2. .env dosyasına REDIS_URL ekle
 * 3. Aşağıdaki kodu uncomment et
 *
 * @example
 * ```javascript
 * const redisClient = require('redis').createClient({
 *   url: process.env.REDIS_URL || 'redis://localhost:6379'
 * });
 *
 * const apiLimiterRedis = rateLimit({
 *   windowMs: 15 * 60 * 1000,
 *   max: 100,
 *   store: new RedisStore({
 *     client: redisClient,
 *     prefix: 'rate-limit:'
 *   })
 * });
 * ```
 */

/**
 * Custom Rate Limit Handler
 * Rate limit aşıldığında özel işlem yapılabilir (loglama, alert vb.)
 */
const customRateLimitHandler = (req, res, options) => {
  // Rate limit aşıldığında log kaydet
  console.warn(`Rate limit exceeded: ${req.ip} - ${req.path}`);

  // İsterseniz buraya alert/notification sistemi eklenebilir
  // await sendAlert(`Rate limit exceeded by ${req.ip}`);

  res.status(options.statusCode).json(options.message);
};

/**
 * IP-based Rate Limiter (Kullanıcı bazlı değil, IP bazlı)
 * Proxy arkasındaysa X-Forwarded-For header'ını kullanır
 */
const trustProxy = req => {
  return req.headers['x-forwarded-for'] || req.connection.remoteAddress;
};

/**
 * Endpoint-specific Rate Limiter Factory
 * Belirli endpoint'ler için özel rate limit oluşturur
 *
 * @param {number} windowMs - Zaman penceresi (ms)
 * @param {number} max - Maksimum istek sayısı
 * @param {string} message - Hata mesajı
 * @returns {Function} Rate limiter middleware
 */
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      errorCode: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Slow Down Middleware
 * Rate limit aşılmadan önce istekleri yavaşlatır
 *
 * @example
 * const slowDown = require('express-slow-down');
 *
 * const speedLimiter = slowDown({
 *   windowMs: 15 * 60 * 1000, // 15 dakika
 *   delayAfter: 50, // 50 istekten sonra yavaşlat
 *   delayMs: 500 // Her istekte 500ms gecikme ekle
 * });
 */

module.exports = {
  apiLimiter,
  strictLimiter,
  createAccountLimiter,
  uploadLimiter,
  passwordResetLimiter,
  createRateLimiter,
  customRateLimitHandler,
};
