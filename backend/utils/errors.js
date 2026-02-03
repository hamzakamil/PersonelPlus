/**
 * Custom Error Siniflari
 * Tum uygulama hatalari icin standart yapi
 */

/**
 * Temel uygulama hatasi sinifi
 * Tum ozel hatalar bu siniftan turetilir
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Gecersiz istek
 */
class BadRequestError extends AppError {
  constructor(message = 'Gecersiz istek', errorCode = 'BAD_REQUEST') {
    super(message, 400, errorCode);
  }
}

/**
 * 401 Unauthorized - Kimlik dogrulama hatasi
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Yetkilendirme gerekli', errorCode = 'UNAUTHORIZED') {
    super(message, 401, errorCode);
  }
}

/**
 * 403 Forbidden - Erisim engellendi
 */
class ForbiddenError extends AppError {
  constructor(message = 'Bu islem icin yetkiniz yok', errorCode = 'FORBIDDEN') {
    super(message, 403, errorCode);
  }
}

/**
 * 404 Not Found - Kayit bulunamadi
 */
class NotFoundError extends AppError {
  constructor(message = 'Kayit bulunamadi', errorCode = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

/**
 * 409 Conflict - Cakisma hatasi
 */
class ConflictError extends AppError {
  constructor(message = 'Kayit zaten mevcut', errorCode = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}

/**
 * 422 Unprocessable Entity - Dogrulama hatasi
 */
class ValidationError extends AppError {
  constructor(message = 'Dogrulama hatasi', errors = [], errorCode = 'VALIDATION_ERROR') {
    super(message, 422, errorCode);
    this.errors = errors;
  }
}

/**
 * 429 Too Many Requests - Cok fazla istek
 */
class RateLimitError extends AppError {
  constructor(message = 'Cok fazla istek, lutfen bekleyin', errorCode = 'RATE_LIMIT') {
    super(message, 429, errorCode);
  }
}

/**
 * 500 Internal Server Error - Sunucu hatasi
 */
class InternalError extends AppError {
  constructor(message = 'Sunucu hatasi', errorCode = 'INTERNAL_ERROR') {
    super(message, 500, errorCode);
    this.isOperational = false;
  }
}

/**
 * Is mantigi hatasi (ozel error kodlari icin)
 * Ornek: QUOTA_EXCEEDED, DUPLICATE_TC, INSUFFICIENT_BALANCE
 */
class BusinessError extends AppError {
  constructor(message, errorCode, statusCode = 400) {
    super(message, statusCode, errorCode);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalError,
  BusinessError
};
