/**
 * Ortak Validation Semalari
 * Tum route'larda kullanilabilecek yeniden kullanilabilir schemalar
 */

const Joi = require('joi');

/**
 * MongoDB ObjectId validation
 */
const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('Gecersiz ID formati');

/**
 * Zorunlu ObjectId
 */
const objectIdRequired = objectId.required();

/**
 * Sayfalama parametreleri
 */
const pagination = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string(),
  order: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Tarih araligi
 */
const dateRange = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate'))
});

/**
 * Telefon numarasi (Turkiye formati)
 * Ornek: 5551234567, +905551234567, 05551234567
 */
const phoneNumber = Joi.string()
  .pattern(/^(\+90|0)?[5][0-9]{9}$/)
  .message('Gecerli bir telefon numarasi giriniz');

/**
 * TC Kimlik Numarasi
 */
const tcKimlikNo = Joi.string()
  .length(11)
  .pattern(/^[0-9]+$/)
  .message('TC Kimlik No 11 haneli sayi olmalidir');

/**
 * E-posta
 */
const email = Joi.string()
  .email()
  .lowercase()
  .trim();

/**
 * Sifre (min 6 karakter)
 */
const password = Joi.string()
  .min(6)
  .max(128);

/**
 * Turkce karakterli isim
 */
const turkishName = Joi.string()
  .pattern(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/)
  .trim();

/**
 * Para miktari (pozitif, 2 ondalik)
 */
const money = Joi.number()
  .positive()
  .precision(2);

/**
 * Yuzde degeri (0-100)
 */
const percentage = Joi.number()
  .min(0)
  .max(100);

/**
 * Aktif/Pasif durumu
 */
const isActive = Joi.boolean().default(true);

/**
 * Params icin id validation
 */
const idParam = Joi.object({
  id: objectIdRequired
});

/**
 * Company ID param
 */
const companyIdParam = Joi.object({
  companyId: objectIdRequired
});

module.exports = {
  objectId,
  objectIdRequired,
  pagination,
  dateRange,
  phoneNumber,
  tcKimlikNo,
  email,
  password,
  turkishName,
  money,
  percentage,
  isActive,
  idParam,
  companyIdParam
};
