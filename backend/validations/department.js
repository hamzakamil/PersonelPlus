/**
 * Department Validation Semalari
 */

const Joi = require('joi');
const { objectId, objectIdRequired, isActive } = require('./common');

/**
 * Departman olusturma
 */
const createDepartment = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required()
      .messages({
        'string.empty': 'Departman adi zorunludur',
        'string.min': 'Departman adi en az 2 karakter olmali',
        'string.max': 'Departman adi en fazla 100 karakter olmali',
        'any.required': 'Departman adi zorunludur'
      }),
    company: objectId,
    parent: objectId,
    parentDepartment: objectId,
    description: Joi.string().trim().max(500).allow('', null),
    workingHours: objectId,
    manager: objectId,
    workplace: objectId
  })
};

/**
 * Departman guncelleme
 */
const updateDepartment = {
  params: Joi.object({
    id: objectIdRequired
  }),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100)
      .messages({
        'string.min': 'Departman adi en az 2 karakter olmali',
        'string.max': 'Departman adi en fazla 100 karakter olmali'
      }),
    parent: objectId.allow(null),
    parentDepartment: objectId.allow(null),
    description: Joi.string().trim().max(500).allow('', null),
    workingHours: objectId.allow(null),
    manager: objectId.allow(null),
    workplace: objectId.allow(null),
    isActive: isActive
  })
};

/**
 * Departman silme / getirme
 */
const departmentById = {
  params: Joi.object({
    id: objectIdRequired
  })
};

/**
 * Sirket bazli departman listesi
 */
const departmentsByCompany = {
  params: Joi.object({
    companyId: objectIdRequired
  })
};

/**
 * Departman listesi query
 */
const listDepartments = {
  query: Joi.object({
    company: objectId
  })
};

module.exports = {
  createDepartment,
  updateDepartment,
  departmentById,
  departmentsByCompany,
  listDepartments
};
