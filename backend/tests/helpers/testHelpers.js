/**
 * Test Helper Functions
 * Test dosyalarinda kullanilacak yardimci fonksiyonlar
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

/**
 * Test kullanicisi olustur
 * @param {Object} overrides - Varsayilan degerleri override et
 */
const createTestUser = (overrides = {}) => {
  return {
    _id: new mongoose.Types.ObjectId(),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: {
      _id: new mongoose.Types.ObjectId(),
      name: 'company_admin',
      priority: 3
    },
    company: new mongoose.Types.ObjectId(),
    dealer: new mongoose.Types.ObjectId(),
    isActive: true,
    ...overrides
  };
};

/**
 * JWT token olustur
 * @param {Object} user - Kullanici objesi
 * @param {Object} options - Token opsiyonlari
 */
const generateTestToken = (user, options = {}) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role?.name || 'employee'
  };

  const secret = process.env.JWT_SECRET || 'test-secret-key';
  const expiresIn = options.expiresIn || '1h';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Auth header olustur
 * @param {string} token - JWT token
 */
const authHeader = (token) => {
  return { Authorization: `Bearer ${token}` };
};

/**
 * Test icin gecerli ObjectId olustur
 */
const createObjectId = () => {
  return new mongoose.Types.ObjectId();
};

/**
 * Gecersiz ObjectId string
 */
const invalidObjectId = 'invalid-id-123';

/**
 * Test sirket verisi olustur
 */
const createTestCompany = (overrides = {}) => {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Sirket',
    taxNumber: '1234567890',
    contactEmail: 'company@example.com',
    contactPhone: '5551234567',
    dealer: new mongoose.Types.ObjectId(),
    isActive: true,
    ...overrides
  };
};

/**
 * Test calisan verisi olustur
 */
const createTestEmployee = (overrides = {}) => {
  return {
    _id: new mongoose.Types.ObjectId(),
    firstName: 'Test',
    lastName: 'Employee',
    email: 'employee@example.com',
    tcKimlikNo: '12345678901',
    phone: '5551234567',
    company: new mongoose.Types.ObjectId(),
    department: new mongoose.Types.ObjectId(),
    isActive: true,
    ...overrides
  };
};

/**
 * Test departman verisi olustur
 */
const createTestDepartment = (overrides = {}) => {
  return {
    _id: new mongoose.Types.ObjectId(),
    name: 'Test Departman',
    company: new mongoose.Types.ObjectId(),
    isActive: true,
    isDefault: false,
    ...overrides
  };
};

/**
 * API response yapisi kontrol et
 * @param {Object} response - Supertest response
 * @param {boolean} expectSuccess - Basari bekleniyor mu
 */
const expectApiResponse = (response, expectSuccess = true) => {
  expect(response.body).toHaveProperty('success', expectSuccess);
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('message');
};

/**
 * Error response yapisi kontrol et
 * @param {Object} response - Supertest response
 * @param {number} statusCode - Beklenen HTTP status
 */
const expectErrorResponse = (response, statusCode) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
};

/**
 * Pagination meta kontrolu
 * @param {Object} meta - Response meta objesi
 */
const expectPaginationMeta = (meta) => {
  expect(meta).toHaveProperty('page');
  expect(meta).toHaveProperty('limit');
  expect(meta).toHaveProperty('total');
  expect(meta).toHaveProperty('totalPages');
  expect(meta).toHaveProperty('hasNext');
  expect(meta).toHaveProperty('hasPrev');
};

module.exports = {
  createTestUser,
  generateTestToken,
  authHeader,
  createObjectId,
  invalidObjectId,
  createTestCompany,
  createTestEmployee,
  createTestDepartment,
  expectApiResponse,
  expectErrorResponse,
  expectPaginationMeta
};
