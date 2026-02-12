# Security Middleware Documentation

> 🔒 PersonelPlus Backend güvenlik katmanları ve middleware yapılandırması

## 📋 İçindekiler

- [Genel Bakış](#genel-bakış)
- [Rate Limiting](#rate-limiting)
- [Input Sanitization](#input-sanitization)
- [Security Headers](#security-headers)
- [Authentication & Authorization](#authentication--authorization)
- [File Upload Security](#file-upload-security)
- [Audit Logging](#audit-logging)
- [Best Practices](#best-practices)

## 🎯 Genel Bakış

PersonelPlus, çok katmanlı güvenlik yapısı kullanarak OWASP Top 10 güvenlik açıklarına karşı koruma sağlar:

### Güvenlik Katmanları

```
1. Rate Limiting        → DDoS, Brute Force koruması
2. Security Headers     → XSS, Clickjacking, MIME sniffing
3. Input Sanitization   → SQL/NoSQL Injection, XSS
4. Authentication       → JWT token validation
5. Authorization        → RBAC (Role-Based Access Control)
6. Validation           → Joi schema validation
7. Error Handling       → Güvenli hata mesajları
8. Audit Logging        → Hassas işlem takibi
```

## 🚦 Rate Limiting

### Dosya: `middleware/rateLimiter.js`

Rate limiting, API endpoint'lerine gelen istekleri sınırlayarak DDoS ve brute force saldırılarını önler.

### Limiter Türleri

#### 1. General API Limiter

```javascript
const { apiLimiter } = require('./middleware/rateLimiter');

app.use('/api/', apiLimiter);
```

**Yapılandırma:**

- **Pencere**: 15 dakika
- **Maksimum**: 100 istek/IP
- **Kullanım**: Tüm API endpoint'leri için

#### 2. Strict Limiter (Login/Register)

```javascript
const { strictLimiter } = require('./middleware/rateLimiter');

app.post('/api/auth/login', strictLimiter, loginController);
```

**Yapılandırma:**

- **Pencere**: 15 dakika
- **Maksimum**: 5 istek/IP
- **Kullanım**: Login, register, hassas işlemler

#### 3. Account Creation Limiter

```javascript
const { createAccountLimiter } = require('./middleware/rateLimiter');

app.post('/api/auth/register', createAccountLimiter, registerController);
```

**Yapılandırma:**

- **Pencere**: 1 saat
- **Maksimum**: 3 istek/IP
- **Kullanım**: Hesap oluşturma

#### 4. Upload Limiter

```javascript
const { uploadLimiter } = require('./middleware/rateLimiter');

app.post('/api/upload', uploadLimiter, uploadController);
```

**Yapılandırma:**

- **Pencere**: 1 saat
- **Maksimum**: 50 istek/IP
- **Kullanım**: Dosya yükleme

#### 5. Password Reset Limiter

```javascript
const { passwordResetLimiter } = require('./middleware/rateLimiter');

app.post('/api/auth/reset-password', passwordResetLimiter, resetController);
```

**Yapılandırma:**

- **Pencere**: 1 saat
- **Maksimum**: 3 istek/IP
- **Kullanım**: Şifre sıfırlama

### Custom Rate Limiter

Belirli ihtiyaçlar için özel rate limiter oluşturabilirsiniz:

```javascript
const { createRateLimiter } = require('./middleware/rateLimiter');

const customLimiter = createRateLimiter(
  60 * 1000, // 1 dakika
  10, // 10 istek
  'Çok fazla istek, yavaşlayın!'
);

app.use('/api/reports/generate', customLimiter, reportController);
```

### Redis ile Production Rate Limiting

Production ortamında Redis kullanılması önerilir:

```javascript
const redis = require('redis');
const RedisStore = require('rate-limit-redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
});

const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

## 🧹 Input Sanitization

### Dosya: `middleware/sanitize.js`

Input sanitization, zararlı girdileri temizleyerek XSS ve NoSQL injection saldırılarını önler.

### NoSQL Injection Koruması

```javascript
const { noSqlSanitizer } = require('./middleware/sanitize');

app.use(noSqlSanitizer);
```

**Koruma:**

- `$`, `.` gibi MongoDB operatörlerini temizler
- Object içinde tehlikeli alanları engeller

**Örnek:**

```javascript
// Tehlikeli input
{ email: { $gt: "" }, password: "123" }

// Sanitize edilmiş
{ email: "", password: "123" }
```

### XSS Koruması

```javascript
const { xssSanitizer } = require('./middleware/sanitize');

app.use(xssSanitizer);
```

**Koruma:**

- HTML/JavaScript injection'ı engeller
- Script tag'lerini encode eder

**Örnek:**

```javascript
// Tehlikeli input
{
  name: "<script>alert('xss')</script>";
}

// Sanitize edilmiş
{
  name: "&lt;script&gt;alert('xss')&lt;/script&gt;";
}
```

### Request Sanitizer

Tüm request verilerini otomatik sanitize eder:

```javascript
const { sanitizeRequest } = require('./middleware/sanitize');

app.use(sanitizeRequest);
```

**Temizlenen Alanlar:**

- `req.body`
- `req.query`
- `req.params`

### Field-Specific Sanitizers

Belirli alanlar için özel sanitizer'lar:

```javascript
const { createFieldSanitizer } = require('./middleware/sanitize');

const sanitizeUserInput = createFieldSanitizer({
  body: {
    email: 'email',
    phone: 'phone',
    website: 'url',
  },
});

app.post('/api/users', sanitizeUserInput, createUserController);
```

**Desteklenen Tipler:**

- `email` - Email normalize ve validasyon
- `phone` - Türkiye telefon formatı
- `url` - URL validasyon
- `filePath` - Path traversal koruması

### Örnek Kullanımlar

#### Email Sanitization

```javascript
const { sanitizeEmail } = require('./middleware/sanitize');

const cleanEmail = sanitizeEmail('  USER@EXAMPLE.COM  ');
// Result: 'user@example.com'
```

#### Phone Sanitization

```javascript
const { sanitizePhoneNumber } = require('./middleware/sanitize');

const cleanPhone = sanitizePhoneNumber('0 (532) 123-45-67');
// Result: '05321234567'
```

#### File Path Sanitization

```javascript
const { sanitizeFilePath } = require('./middleware/sanitize');

const cleanPath = sanitizeFilePath('../../etc/passwd');
// Result: 'etcpasswd' (tehlikeli karakterler temizlendi)
```

## 🛡️ Security Headers

### Dosya: `middleware/security.js`

Security headers, tarayıcı tarafı güvenlik önlemleri için HTTP header'ları ekler.

### Helmet.js Yapılandırması

```javascript
const { securityHeaders } = require('./middleware/security');

app.use(securityHeaders);
```

**Eklenen Header'lar:**

| Header                    | Koruma                   | Değer                |
| ------------------------- | ------------------------ | -------------------- |
| Content-Security-Policy   | XSS, data injection      | `default-src 'self'` |
| X-Frame-Options           | Clickjacking             | `DENY`               |
| X-Content-Type-Options    | MIME sniffing            | `nosniff`            |
| X-XSS-Protection          | XSS                      | `1; mode=block`      |
| Strict-Transport-Security | HTTPS zorlama            | `max-age=31536000`   |
| Referrer-Policy           | Referrer bilgi sızıntısı | `no-referrer`        |
| Permissions-Policy        | Feature policy           | `geolocation=()`     |

### HTTP Parameter Pollution (HPP) Koruması

```javascript
const { hppProtection } = require('./middleware/security');

app.use(hppProtection);
```

**Koruma:**

- Aynı parametrenin birden fazla gönderilmesini engeller
- Whitelist ile belirli parametrelere array izni verir

**Örnek:**

```javascript
// Tehlikeli request
/api/users?id=1&id=2

// HPP sonrası
// Sadece ilk parametreyi kullanır: id=1
```

### CORS Yapılandırması

```javascript
const cors = require('cors');
const { corsOptions } = require('./middleware/security');

app.use(cors(corsOptions));
```

**Yapılandırma:**

- İzin verilen origin'ler
- Credentials desteği
- Allowed methods ve headers
- Preflight cache

### Request Size Limiter

```javascript
const { requestSizeLimiter } = require('./middleware/security');

app.use(express.json(requestSizeLimiter.json));
app.use(express.urlencoded(requestSizeLimiter.urlencoded));
```

**Limitler:**

- JSON payload: 10MB
- URL encoded: 10MB
- Raw payload: 10MB

### Custom Security Headers

```javascript
const { customSecurityHeaders } = require('./middleware/security');

app.use(customSecurityHeaders);
```

**Ek Header'lar:**

- Permissions-Policy
- Cache-Control (API endpoint'leri için)
- Additional security headers

## 🔐 Authentication & Authorization

### JWT Authentication

**Dosya**: `middleware/auth.js`

```javascript
const { auth } = require('./middleware/auth');

app.get('/api/profile', auth, profileController);
```

**Güvenlik Özellikleri:**

- JWT token validation
- Token expiration check
- User verification
- Populate ile ilişkili veriler

### Role-Based Authorization

```javascript
const { auth, requireRole } = require('./middleware/auth');

app.delete('/api/users/:id', auth, requireRole('super_admin'), deleteUserController);
```

**Desteklenen Roller:**

- `super_admin`
- `bayi_admin`
- `company_admin`
- `employee`

### Permission-Based Authorization

**Dosya**: `middleware/permissions.js`

```javascript
const { requirePermission } = require('./middleware/permissions');

app.post('/api/companies', auth, requirePermission('company:create'), createCompanyController);
```

**İnce Taneli Yetki Kontrolü:**

- Resource-action bazlı yetkiler
- Bayi bazlı izolasyon
- Şirket bazlı erişim kontrolü

## 📁 File Upload Security

### File Type Validation

```javascript
const { fileUploadSecurity } = require('./middleware/security');

const upload = multer({
  fileFilter: (req, file, cb) => {
    if (fileUploadSecurity.validateFileType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Desteklenmeyen dosya tipi'));
    }
  },
  limits: {
    fileSize: fileUploadSecurity.maxFileSize,
  },
});
```

**İzin Verilen Dosya Tipleri:**

- Images: JPEG, PNG, GIF
- Documents: PDF, DOC, DOCX
- Spreadsheets: XLS, XLSX

**Maksimum Boyut:** 10MB

### File Name Sanitization

```javascript
const { fileUploadSecurity } = require('./middleware/security');

const safeName = fileUploadSecurity.sanitizeFileName(originalName);
```

**Temizleme:**

- Tehlikeli karakterleri kaldır
- Path traversal önleme
- Maksimum uzunluk limiti

## 📝 Audit Logging

### Request Logger

```javascript
const { auditLogger } = require('./middleware/security');

app.use(auditLogger);
```

**Loglanan Bilgiler:**

- Timestamp
- HTTP method
- Request path
- Client IP
- User agent
- User ID

**Loglanan Endpoint'ler:**

- Authentication (`/api/auth/*`)
- User management (`/api/users/*`)
- Company/Dealer operations

### Custom Audit Log

```javascript
const logAuditEvent = (req, action, details) => {
  console.log({
    timestamp: new Date().toISOString(),
    userId: req.user?.id,
    action,
    details,
    ip: req.ip,
  });
};

// Kullanım
app.post('/api/sensitive-action', auth, (req, res) => {
  logAuditEvent(req, 'SENSITIVE_ACTION', { data: req.body });
  // ...
});
```

## ✅ Best Practices

### 1. Katmanlı Güvenlik (Defense in Depth)

```javascript
app.post(
  '/api/auth/login',
  strictLimiter, // 1. Rate limiting
  validateContentType(), // 2. Content-type check
  sanitizeRequest, // 3. Input sanitization
  validate(loginSchema), // 4. Schema validation
  loginController // 5. Business logic
);
```

### 2. Production Checklist

- [x] Rate limiting aktif
- [x] Helmet headers yapılandırıldı
- [x] Input sanitization aktif
- [x] HTTPS zorunlu (HSTS)
- [x] Environment variables güvenli (.env.example kullan)
- [x] JWT secret güçlü ve rastgele
- [x] Database connection string güvenli
- [x] Error messages production'da detaysız
- [x] Audit logging aktif
- [x] Regular security updates

### 3. Environment-Specific Configuration

```javascript
// Development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Request logging
  // Detailed error messages
}

// Production
if (process.env.NODE_ENV === 'production') {
  app.use(compression()); // Response compression
  app.set('trust proxy', 1); // Proxy arkasındaysa
  // Minimal error messages
}
```

### 4. Regular Security Audits

```bash
# NPM audit
npm audit

# Dependency check
npm outdated

# Security scan
npm run security:scan
```

### 5. Error Handling

```javascript
// Güvenli hata mesajları
// ❌ Kötü
res.status(500).json({ error: err.stack });

// ✅ İyi
res.status(500).json({
  success: false,
  message: 'Bir hata oluştu',
  errorCode: 'INTERNAL_ERROR',
});
```

## 🔧 Server.js Integration

Tüm security middleware'lerinin server.js'e entegrasyonu:

```javascript
const express = require('express');
const cors = require('cors');

// Security middleware imports
const {
  securityHeaders,
  hppProtection,
  corsOptions,
  customSecurityHeaders,
  auditLogger,
} = require('./middleware/security');
const { noSqlSanitizer, xssSanitizer, sanitizeRequest } = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// 1. Trust proxy (if behind reverse proxy)
app.set('trust proxy', 1);

// 2. Security headers
app.use(securityHeaders);
app.use(customSecurityHeaders);

// 3. CORS
app.use(cors(corsOptions));

// 4. Body parsers with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Input sanitization
app.use(noSqlSanitizer);
app.use(xssSanitizer);
app.use(sanitizeRequest);

// 6. HPP protection
app.use(hppProtection);

// 7. Rate limiting
app.use('/api/', apiLimiter);

// 8. Audit logging
app.use(auditLogger);

// 9. Routes
app.use('/api/auth', authRoutes);
// ...

// 10. Error handling
app.use(notFoundHandler);
app.use(errorHandler);
```

## 📊 Security Monitoring

### Metrics to Track

1. **Rate Limit Violations**
   - IP addresses hitting limits
   - Endpoint patterns

2. **Failed Authentication Attempts**
   - Brute force detection
   - Suspicious IP tracking

3. **Input Sanitization Triggers**
   - XSS attempts
   - NoSQL injection attempts

4. **Unusual Activity**
   - Large file uploads
   - Multiple failed requests
   - Unusual request patterns

### Alerting

```javascript
// Example alert system
const sendSecurityAlert = (type, details) => {
  console.error(`[SECURITY ALERT] ${type}:`, details);

  // Send to monitoring service (Sentry, LogRocket, etc.)
  // sentry.captureMessage(`Security Alert: ${type}`, { extra: details });

  // Send email notification for critical alerts
  // if (type === 'CRITICAL') {
  //   sendEmailAlert(details);
  // }
};
```

## 🔗 İlgili Dokümantasyon

- [Main README](../README.md)
- [RBAC Implementation](../RBAC_IMPLEMENTATION.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Error Handling Guide](./utils/errors.js)

## 📞 Güvenlik Konuları

Güvenlik açığı tespit ederseniz:

- 📧 Email: security@personelplus.com
- 🔒 Responsible disclosure policy
- 🐛 GitHub Security Advisory

---

> ⚠️ **Önemli**: Bu dokümantasyon hassas güvenlik bilgileri içerir. Sadece yetkili personel erişebilmelidir.

**Son Güncelleme**: 2026-02-10
