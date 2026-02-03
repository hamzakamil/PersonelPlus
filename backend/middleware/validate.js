/**
 * Joi Validation Middleware
 * Request body, query ve params dogrulamasi yapar
 */

const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi schema objesi { body, query, params }
 * @returns {Function} Express middleware
 *
 * @example
 * const schema = {
 *   body: Joi.object({
 *     name: Joi.string().required(),
 *     email: Joi.string().email().required()
 *   })
 * };
 * router.post('/', validate(schema), controller);
 */
const validate = (schema) => {
  return (req, res, next) => {
    const validationErrors = [];

    // Body validation
    if (schema.body) {
      const { error } = schema.body.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        validationErrors.push(...formatJoiErrors(error, 'body'));
      }
    }

    // Query validation
    if (schema.query) {
      const { error } = schema.query.validate(req.query, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        validationErrors.push(...formatJoiErrors(error, 'query'));
      }
    }

    // Params validation
    if (schema.params) {
      const { error } = schema.params.validate(req.params, {
        abortEarly: false,
        stripUnknown: true
      });
      if (error) {
        validationErrors.push(...formatJoiErrors(error, 'params'));
      }
    }

    if (validationErrors.length > 0) {
      throw new ValidationError('Dogrulama hatasi', validationErrors);
    }

    next();
  };
};

/**
 * Joi hatalarini standart formata cevirir
 * @param {Object} error - Joi validation error
 * @param {string} source - Hatanin kaynagi (body, query, params)
 * @returns {Array} Formatlanmis hata listesi
 */
const formatJoiErrors = (error, source) => {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: translateJoiMessage(detail),
    source
  }));
};

/**
 * Joi hata mesajlarini Turkce'ye cevirir
 * @param {Object} detail - Joi error detail
 * @returns {string} Turkce hata mesaji
 */
const translateJoiMessage = (detail) => {
  const field = detail.path.join('.');
  const translations = {
    'string.empty': `${field} alani bos birakilamaz`,
    'string.min': `${field} en az ${detail.context?.limit} karakter olmali`,
    'string.max': `${field} en fazla ${detail.context?.limit} karakter olmali`,
    'string.email': `${field} gecerli bir e-posta adresi olmali`,
    'string.pattern.base': `${field} gecersiz format`,
    'number.base': `${field} bir sayi olmali`,
    'number.min': `${field} en az ${detail.context?.limit} olmali`,
    'number.max': `${field} en fazla ${detail.context?.limit} olmali`,
    'number.positive': `${field} pozitif bir sayi olmali`,
    'number.integer': `${field} tam sayi olmali`,
    'date.base': `${field} gecerli bir tarih olmali`,
    'date.min': `${field} ${detail.context?.limit} tarihinden sonra olmali`,
    'date.max': `${field} ${detail.context?.limit} tarihinden once olmali`,
    'array.base': `${field} bir dizi olmali`,
    'array.min': `${field} en az ${detail.context?.limit} eleman icermeli`,
    'array.max': `${field} en fazla ${detail.context?.limit} eleman icermeli`,
    'object.base': `${field} bir obje olmali`,
    'any.required': `${field} alani zorunludur`,
    'any.only': `${field} gecersiz deger`,
    'any.invalid': `${field} gecersiz deger`
  };

  return translations[detail.type] || detail.message;
};

module.exports = validate;
