/**
 * Standart API Response Helper
 * Format: { success, data, message, errors, meta }
 */

/**
 * Basarili response
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {*} options.data - Response data
 * @param {string} options.message - Success message
 * @param {Object} options.meta - Pagination/extra info
 * @param {number} options.statusCode - HTTP status code (default: 200)
 */
const successResponse = (res, { data = null, message = 'Islem basarili', meta = null, statusCode = 200 } = {}) => {
  const response = {
    success: true,
    data,
    message
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Hata response
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {string} options.message - Error message
 * @param {Array} options.errors - Detailed errors
 * @param {number} options.statusCode - HTTP status code (default: 400)
 * @param {string} options.errorCode - Ozel hata kodu (QUOTA_EXCEEDED vb.)
 */
const errorResponse = (res, { message = 'Bir hata olustu', errors = null, statusCode = 400, errorCode = null, data = null } = {}) => {
  const response = {
    success: false,
    data,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  if (errorCode) {
    response.errorCode = errorCode;
  }

  return res.status(statusCode).json(response);
};

/**
 * Sayfalama meta bilgisi olustur
 * @param {number} page - Mevcut sayfa
 * @param {number} limit - Sayfa basina kayit
 * @param {number} total - Toplam kayit sayisi
 */
const paginationMeta = (page, limit, total) => {
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
};

/**
 * Yaygin hata yanitlari
 */
const notFound = (res, message = 'Kayit bulunamadi') => {
  return errorResponse(res, { message, statusCode: 404, errorCode: 'NOT_FOUND' });
};

const unauthorized = (res, message = 'Yetkilendirme gerekli') => {
  return errorResponse(res, { message, statusCode: 401, errorCode: 'UNAUTHORIZED' });
};

const forbidden = (res, message = 'Bu islem icin yetkiniz yok') => {
  return errorResponse(res, { message, statusCode: 403, errorCode: 'FORBIDDEN' });
};

const validationError = (res, errors, message = 'Dogrulama hatasi') => {
  return errorResponse(res, { message, errors, statusCode: 422, errorCode: 'VALIDATION_ERROR' });
};

const serverError = (res, error, message = 'Sunucu hatasi') => {
  console.error('Server Error:', error);
  return errorResponse(res, {
    message,
    errors: process.env.NODE_ENV === 'development' ? [error.message] : null,
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR'
  });
};

/**
 * Liste response (sayfalama destekli)
 */
const listResponse = (res, { data, page, limit, total, message = 'Liste basariyla getirildi' }) => {
  return successResponse(res, {
    data,
    message,
    meta: paginationMeta(page, limit, total)
  });
};

/**
 * Olusturma response
 */
const createdResponse = (res, { data, message = 'Kayit basariyla olusturuldu' }) => {
  return successResponse(res, { data, message, statusCode: 201 });
};

/**
 * Silme response
 */
const deletedResponse = (res, { message = 'Kayit basariyla silindi' } = {}) => {
  return successResponse(res, { data: null, message });
};

module.exports = {
  successResponse,
  errorResponse,
  paginationMeta,
  notFound,
  unauthorized,
  forbidden,
  validationError,
  serverError,
  listResponse,
  createdResponse,
  deletedResponse
};
