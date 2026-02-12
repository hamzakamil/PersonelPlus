/**
 * Input Sanitization Middleware
 * XSS, NoSQL Injection ve diğer güvenlik açıklarına karşı koruma
 */

const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const validator = require('validator');

/**
 * MongoDB NoSQL Injection Koruması
 * $, . gibi karakterleri temizler
 *
 * @example
 * Input:  { email: { $gt: "" }, password: "123" }
 * Output: { email: "", password: "123" }
 */
const noSqlSanitizer = mongoSanitize({
  // '$' ve '.' karakterlerini kaldır
  replaceWith: '_',
  // Sadece body, params ve query'i temizle (headers'ı dokunma)
  onSanitize: ({ req, key }) => {
    console.warn(`NoSQL injection attempt detected: ${key} from IP ${req.ip}`);
  },
});

/**
 * XSS (Cross-Site Scripting) Koruması
 * HTML/JavaScript injection'ı önler
 *
 * @example
 * Input:  { name: "<script>alert('xss')</script>" }
 * Output: { name: "&lt;script&gt;alert('xss')&lt;/script&gt;" }
 */
const xssSanitizer = xss();

/**
 * Özel String Sanitizer
 * Tehlikeli karakterleri ve pattern'leri temizler
 */
const sanitizeString = str => {
  if (typeof str !== 'string') return str;

  // HTML etiketlerini temizle
  str = str.replace(/<[^>]*>/g, '');

  // SQL injection pattern'lerini temizle
  str = str.replace(/('|(--)|;|\/\*|\*\/|xp_|sp_|exec|execute|declare|cast|convert)/gi, '');

  // Fazla whitespace'leri temizle
  str = str.trim().replace(/\s+/g, ' ');

  return str;
};

/**
 * Email Sanitizer ve Validator
 */
const sanitizeEmail = email => {
  if (!email || typeof email !== 'string') return email;

  // Normalize et (küçük harfe çevir, whitespace temizle)
  email = validator.normalizeEmail(email, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
  });

  // Email validation
  if (!validator.isEmail(email)) {
    throw new Error('Geçersiz email formatı');
  }

  return email;
};

/**
 * URL Sanitizer ve Validator
 */
const sanitizeURL = url => {
  if (!url || typeof url !== 'string') return url;

  // URL validation
  if (
    !validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true,
    })
  ) {
    throw new Error('Geçersiz URL formatı');
  }

  return url;
};

/**
 * Phone Number Sanitizer
 * Türkiye telefon numarası formatına uygun hale getirir
 */
const sanitizePhoneNumber = phone => {
  if (!phone || typeof phone !== 'string') return phone;

  // Sadece rakamları al
  let cleaned = phone.replace(/\D/g, '');

  // Başında 0 varsa kaldır
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Başında 90 varsa kaldır (Türkiye kodu)
  if (cleaned.startsWith('90')) {
    cleaned = cleaned.substring(2);
  }

  // 10 haneli olmalı
  if (cleaned.length !== 10) {
    throw new Error('Geçersiz telefon numarası formatı. 10 haneli olmalı.');
  }

  // 5 ile başlamalı (mobil)
  if (!cleaned.startsWith('5')) {
    throw new Error('Geçersiz telefon numarası. Mobil numara 5 ile başlamalı.');
  }

  return '0' + cleaned; // 0 ile başlayan format döndür
};

/**
 * File Path Sanitizer
 * Path traversal saldırılarını önler
 */
const sanitizeFilePath = filePath => {
  if (!filePath || typeof filePath !== 'string') return filePath;

  // Path traversal pattern'lerini temizle
  filePath = filePath.replace(/\.\./g, '');
  filePath = filePath.replace(/[/\\]/g, '');

  // Sadece geçerli karakterleri tut
  filePath = filePath.replace(/[^a-zA-Z0-9._-]/g, '');

  return filePath;
};

/**
 * Object Deep Sanitizer
 * Object'in tüm string değerlerini sanitize eder
 */
const deepSanitizeObject = obj => {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[key] = deepSanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Request Body Sanitizer Middleware
 * Gelen request'lerin body, query ve params'larını sanitize eder
 */
const sanitizeRequest = (req, res, next) => {
  try {
    // Body sanitize
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitizeObject(req.body);
    }

    // Query sanitize
    if (req.query && typeof req.query === 'object') {
      req.query = deepSanitizeObject(req.query);
    }

    // Params sanitize
    if (req.params && typeof req.params === 'object') {
      req.params = deepSanitizeObject(req.params);
    }

    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Geçersiz veri formatı',
      errorCode: 'INVALID_INPUT_FORMAT',
    });
  }
};

/**
 * Specific Field Sanitizers
 * Belirli alanlar için özel sanitizer'lar
 */
const fieldSanitizers = {
  email: sanitizeEmail,
  url: sanitizeURL,
  phone: sanitizePhoneNumber,
  filePath: sanitizeFilePath,
};

/**
 * Sanitize Middleware Factory
 * Belirli alanları sanitize etmek için middleware oluşturur
 *
 * @param {Object} config - Sanitizer yapılandırması
 * @returns {Function} Express middleware
 *
 * @example
 * const sanitizeFields = createFieldSanitizer({
 *   body: {
 *     email: 'email',
 *     phone: 'phone',
 *     website: 'url'
 *   }
 * });
 * router.post('/register', sanitizeFields, controller);
 */
const createFieldSanitizer = config => {
  return (req, res, next) => {
    try {
      // Body fields
      if (config.body) {
        for (const [field, type] of Object.entries(config.body)) {
          if (req.body[field]) {
            const sanitizer = fieldSanitizers[type];
            if (sanitizer) {
              req.body[field] = sanitizer(req.body[field]);
            }
          }
        }
      }

      // Query fields
      if (config.query) {
        for (const [field, type] of Object.entries(config.query)) {
          if (req.query[field]) {
            const sanitizer = fieldSanitizers[type];
            if (sanitizer) {
              req.query[field] = sanitizer(req.query[field]);
            }
          }
        }
      }

      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Veri doğrulama hatası',
        errorCode: 'SANITIZATION_ERROR',
      });
    }
  };
};

/**
 * Content Type Validator
 * Sadece izin verilen content-type'ları kabul eder
 */
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');

    // GET request'lerde content-type kontrolü yapma
    if (req.method === 'GET') {
      return next();
    }

    // Content-Type var mı kontrol et
    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type header gerekli',
        errorCode: 'MISSING_CONTENT_TYPE',
      });
    }

    // İzin verilen type'lardan biri mi kontrol et
    const isAllowed = allowedTypes.some(type => contentType.includes(type));

    if (!isAllowed) {
      return res.status(415).json({
        success: false,
        message: `Desteklenmeyen Content-Type. İzin verilenler: ${allowedTypes.join(', ')}`,
        errorCode: 'UNSUPPORTED_CONTENT_TYPE',
      });
    }

    next();
  };
};

module.exports = {
  noSqlSanitizer,
  xssSanitizer,
  sanitizeRequest,
  sanitizeString,
  sanitizeEmail,
  sanitizeURL,
  sanitizePhoneNumber,
  sanitizeFilePath,
  deepSanitizeObject,
  createFieldSanitizer,
  validateContentType,
  fieldSanitizers,
};
