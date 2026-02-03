/**
 * Departments API Integration Tests
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { createTestApp } = require('./app');
const Department = require('../../models/Department');
const Company = require('../../models/Company');
const User = require('../../models/User');
const Role = require('../../models/Role');
const jwt = require('jsonwebtoken');

// Routes
const departmentRoutes = require('../../routes/departments');

describe('Departments API', () => {
  let app;
  let authToken;
  let testCompany;
  let testUser;
  let testRole;

  beforeAll(async () => {
    // Test app olustur
    app = createTestApp({
      routes: [{ path: '/api/departments', router: departmentRoutes }]
    });

    // Test role olustur
    testRole = await Role.create({
      name: 'company_admin',
      displayName: 'Sirket Yoneticisi',
      priority: 3,
      permissions: []
    });

    // Test company olustur
    testCompany = await Company.create({
      name: 'Test Sirket',
      taxNumber: '1234567890',
      contactEmail: 'test@company.com',
      contactPhone: '5551234567',
      dealer: new mongoose.Types.ObjectId()
    });

    // Test user olustur
    testUser = await User.create({
      email: 'admin@test.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'Admin',
      role: testRole._id,
      company: testCompany._id
    });

    // Auth token olustur
    authToken = jwt.sign(
      { userId: testUser._id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Her testten sonra departmanlari temizle
    await Department.deleteMany({});
  });

  describe('GET /api/departments', () => {
    it('auth olmadan 401 donmeli', async () => {
      const response = await request(app)
        .get('/api/departments')
        .expect(401);

      // Auth middleware farkli format donebilir
      expect(response.status).toBe(401);
    });

    it('auth ile departman listesi donmeli', async () => {
      // Test departmani olustur
      await Department.create({
        name: 'Test Departman',
        company: testCompany._id,
        isActive: true
      });

      const response = await request(app)
        .get('/api/departments')
        .query({ company: testCompany._id.toString() })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/departments/:id', () => {
    it('mevcut departmani getirmeli', async () => {
      const department = await Department.create({
        name: 'Test Departman',
        company: testCompany._id,
        isActive: true
      });

      const response = await request(app)
        .get(`/api/departments/${department._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Departman');
    });

    it('olmayan departman icin 404 donmeli', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/departments/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('gecersiz id icin 422 donmeli', async () => {
      const response = await request(app)
        .get('/api/departments/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/departments', () => {
    it('yeni departman olusturmali', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Yeni Departman',
          company: testCompany._id.toString(),
          description: 'Test aciklamasi'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Yeni Departman');

      // Veritabaninda kontrol
      const saved = await Department.findById(response.body.data._id);
      expect(saved).toBeDefined();
      expect(saved.name).toBe('Yeni Departman');
    });

    it('isim olmadan 422 donmeli', async () => {
      const response = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company: testCompany._id.toString()
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('PUT /api/departments/:id', () => {
    it('departman guncellemeli', async () => {
      const department = await Department.create({
        name: 'Eski Isim',
        company: testCompany._id,
        isActive: true
      });

      const response = await request(app)
        .put(`/api/departments/${department._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Yeni Isim'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Yeni Isim');
    });
  });

  describe('DELETE /api/departments/:id', () => {
    it('departman silmeli', async () => {
      const department = await Department.create({
        name: 'Silinecek',
        company: testCompany._id,
        isActive: true,
        isDefault: false
      });

      await request(app)
        .delete(`/api/departments/${department._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Veritabaninda kontrol
      const deleted = await Department.findById(department._id);
      expect(deleted).toBeNull();
    });
  });
});
