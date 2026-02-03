/**
 * Global Error Handler Middleware
 * Tum uygulama hatalarini yakalar ve standart formatta yanitlar
 */

const { AppError } = require('../utils/errors');

/**
 * MongoDB CastError (gecersiz ObjectId) isleyicisi
 */
const handleCastErrorDB = (err) => {
  const message = `Gecersiz ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

/**
 * MongoDB Duplicate Key hatasi isleyicisi
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Bu ${field} zaten kullaniliyor: ${value}`;
  return new AppError(message, 409, 'DUPLICATE_FIELD');
};

/**
 * Mongoose Validation hatasi isleyicisi
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => ({
    field: el.path,
    message: el.message
  }));
  const message = 'Dogrulama hatasi';
  const error = new AppError(message, 422, 'VALIDATION_ERROR');
  error.errors = errors;
  return error;
};

/**
 * JWT hatasi isleyicisi
 */
const handleJWTError = () => {
  return new AppError('Gecersiz token, lutfen tekrar giris yapin', 401, 'INVALID_TOKEN');
};

/**
 * JWT suresi dolmus hatasi isleyicisi
 */
const handleJWTExpiredError = () => {
  return new AppError('Token suresi dolmus, lutfen tekrar giris yapin', 401, 'TOKEN_EXPIRED');
};

/**
 * Development ortaminda hata yaniti
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    data: null,
    message: err.message,
    errorCode: err.errorCode || null,
    errors: err.errors || null,
    stack: err.stack
  });
};

/**
 * Production ortaminda hata yaniti
 */
const sendErrorProd = (err, res) => {
  // Operasyonel, guvenilir hata: istemciye mesaj gonder
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      data: null,
      message: err.message,
      errorCode: err.errorCode || null,
      errors: err.errors || null
    });
  } else {
    // Programlama veya bilinmeyen hata: detay gosterme
    console.error('HATA:', err);
    res.status(500).json({
      success: false,
      data: null,
      message: 'Bir seyler yanlis gitti',
      errorCode: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Global Error Handler
 * Express'in 4 parametreli error handler middleware'i
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // MongoDB CastError (gecersiz ObjectId)
    if (err.name === 'CastError') {
      error = handleCastErrorDB(err);
    }

    // MongoDB Duplicate Key (kod 11000)
    if (err.code === 11000) {
      error = handleDuplicateFieldsDB(err);
    }

    // Mongoose ValidationError
    if (err.name === 'ValidationError') {
      error = handleValidationErrorDB(err);
    }

    // JWT Error
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }

    // JWT Expired
    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};

/**
 * 404 Not Found Handler
 * Tanimlanmamis route'lar icin
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Bu endpoint bulunamadi: ${req.originalUrl}`, 404, 'ENDPOINT_NOT_FOUND');
  next(err);
};

/**
 * Unhandled Rejection Handler
 * Promise rejection'lari yakalamak icin
 * server.js'de kullanilmali
 */
const setupUnhandledRejectionHandler = (server) => {
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! Kapatiliyor...');
    console.error(err.name, err.message);
    if (server) {
      server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
};

/**
 * Uncaught Exception Handler
 * Yakalanmamis exception'lar icin
 * server.js'de en basta kullanilmali
 */
const setupUncaughtExceptionHandler = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! Kapatiliyor...');
    console.error(err.name, err.message);
    process.exit(1);
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  setupUnhandledRejectionHandler,
  setupUncaughtExceptionHandler
};
