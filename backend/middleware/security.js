/**
 * Security Headers Middleware
 * Güvenlik header'larını yapılandırır (Helmet.js wrapper)
 */

const helmet = require('helmet');
const hpp = require('hpp');

/**
 * Helmet.js Yapılandırması
 * Güvenlik header'larını otomatik ekler
 *
 * Header'lar:
 * - Content-Security-Policy: XSS koruması
 * - X-DNS-Prefetch-Control: DNS prefetch kontrolü
 * - X-Frame-Options: Clickjacking koruması
 * - X-Powered-By: Server bilgisini gizler
 * - Strict-Transport-Security: HTTPS zorlama
 * - X-Content-Type-Options: MIME sniffing koruması
 * - X-XSS-Protection: XSS koruması (eski tarayıcılar)
 */
const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // Cross-Origin Policies
  crossOriginEmbedderPolicy: false, // Frontend ayrı domainse false
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // DNS Prefetch Control
  dnsPrefetchControl: {
    allow: false,
  },

  // Frame Options (Clickjacking koruması)
  frameguard: {
    action: 'deny', // Frame içinde göstermeyi engelle
  },

  // Hide Powered By
  hidePoweredBy: true,

  // HSTS (HTTPS zorlama) - Production'da kullan
  hsts: {
    maxAge: 31536000, // 1 yıl
    includeSubDomains: true,
    preload: true,
  },

  // IE Download Protection
  ieNoOpen: true,

  // MIME Sniffing koruması
  noSniff: true,

  // Referrer Policy
  referrerPolicy: {
    policy: 'no-referrer',
  },

  // XSS Protection (eski tarayıcılar için)
  xssFilter: true,
});

/**
 * HTTP Parameter Pollution (HPP) Koruması
 * Aynı parametrenin birden fazla gönderilmesini engeller
 *
 * @example
 * URL: /api/users?id=1&id=2
 * Sadece ilk parametreyi kullanır: id=1
 */
const hppProtection = hpp({
  // Bu parametreler için array kabul et
  whitelist: ['fields', 'sort', 'filter', 'roles', 'status'],
});

/**
 * Custom Security Headers
 * Ek güvenlik header'ları ekler
 */
const customSecurityHeaders = (req, res, next) => {
  // Permissions Policy (önceden Feature-Policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options (ek katman)
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection (ek katman)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'no-referrer');

  // Cache-Control for sensitive data
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * CORS Configuration
 * Detaylı CORS yapılandırması
 */
const corsOptions = {
  origin: function (origin, callback) {
    // İzin verilen origin'ler
    const allowedOrigins = [
      'http://localhost:5173', // Vue dev server
      'http://localhost:3333',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    // Origin yoksa (Postman, mobile app) veya izin verilenlerdeyse
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy tarafından izin verilmeyen origin'));
    }
  },
  credentials: true, // Cookies izni
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // Preflight cache (24 saat)
  optionsSuccessStatus: 200,
};

/**
 * Request Size Limiter
 * Request body boyutunu sınırlar (Payload attack koruması)
 */
const requestSizeLimiter = {
  json: { limit: '10mb' }, // JSON payloads
  urlencoded: { limit: '10mb', extended: true }, // URL encoded
  raw: { limit: '10mb' }, // Raw payloads
  text: { limit: '10mb' }, // Text payloads
};

/**
 * File Upload Security
 * Dosya yükleme güvenliği için yapılandırma
 */
const fileUploadSecurity = {
  // İzin verilen dosya tipleri
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],

  // Maksimum dosya boyutu (10MB)
  maxFileSize: 10 * 1024 * 1024,

  // Dosya ismi sanitizer
  sanitizeFileName: filename => {
    // Tehlikeli karakterleri temizle
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255);
  },

  // Dosya tipi validator
  validateFileType: mimetype => {
    return fileUploadSecurity.allowedMimeTypes.includes(mimetype);
  },
};

/**
 * Request Logger (Audit Trail)
 * Hassas işlemleri loglar
 */
const auditLogger = (req, res, next) => {
  // Hassas endpoint'leri logla
  const sensitiveRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/users',
    '/api/dealers',
    '/api/companies',
  ];

  const isSensitive = sensitiveRoutes.some(route => req.path.startsWith(route));

  if (isSensitive) {
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id || 'anonymous',
    });
  }

  next();
};

/**
 * IP Whitelist/Blacklist Middleware
 * Belirli IP'leri engeller veya sadece izin verir
 */
const ipFilter = {
  blacklist: [], // Engellenecek IP'ler
  whitelist: [], // İzin verilen IP'ler (boşsa hepsine izin ver)

  middleware: function (req, res, next) {
    const clientIp = req.ip || req.connection.remoteAddress;

    // Whitelist varsa sadece onlara izin ver
    if (this.whitelist.length > 0 && !this.whitelist.includes(clientIp)) {
      return res.status(403).json({
        success: false,
        message: 'Bu IP adresinden erişim izni yok',
        errorCode: 'IP_NOT_WHITELISTED',
      });
    }

    // Blacklist kontrolü
    if (this.blacklist.includes(clientIp)) {
      return res.status(403).json({
        success: false,
        message: 'Bu IP adresi engellenmiştir',
        errorCode: 'IP_BLACKLISTED',
      });
    }

    next();
  },
};

/**
 * Request Timeout Middleware
 * Uzun süren istekleri otomatik sonlandırır
 */
const requestTimeout = (timeout = 30000) => {
  return (req, res, next) => {
    req.setTimeout(timeout, () => {
      res.status(408).json({
        success: false,
        message: 'İstek zaman aşımına uğradı',
        errorCode: 'REQUEST_TIMEOUT',
      });
    });
    next();
  };
};

module.exports = {
  securityHeaders,
  hppProtection,
  customSecurityHeaders,
  corsOptions,
  requestSizeLimiter,
  fileUploadSecurity,
  auditLogger,
  ipFilter,
  requestTimeout,
};
