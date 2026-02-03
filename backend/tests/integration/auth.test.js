/**
 * Auth API Integration Tests
 */

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createTestApp } = require('./app');
const User = require('../../models/User');
const Role = require('../../models/Role');
const Company = require('../../models/Company');

// Routes
const authRoutes = require('../../routes/auth');

describe('Auth API', () => {
  let app;
  let testRole;
  let testCompany;

  beforeAll(async () => {
    // Test app olustur
    app = createTestApp({
      routes: [{ path: '/api/auth', router: authRoutes }]
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
  });

  afterEach(async () => {
    // Her testten sonra userlari temizle
    await User.deleteMany({});
  });

  describe('POST /api/auth/login', () => {
    it('gecerli bilgilerle giris yapmali', async () => {
      // Test user olustur
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('hatali sifre ile 401 donmeli', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: true
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('hatalı');
    });

    it('olmayan kullanici ile 401 donmeli', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('inaktif kullanici giris yapamamali', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        email: 'inactive@example.com',
        password: hashedPassword,
        firstName: 'Inactive',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('aktif değil');
    });

    it('email olmadan 400 donmeli', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('gecerli token ile kullanici bilgisi donmeli', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: true
      });

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.role).toBe('company_admin');
    });

    it('token olmadan 401 donmeli', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      // Auth middleware farkli format donebilir
      expect(response.status).toBe(401);
    });

    it('gecersiz token ile 401 donmeli', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Auth middleware farkli format donebilir
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('sifre degistirmeli', async () => {
      const hashedPassword = await bcrypt.hash('oldpassword', 10);
      const user = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: true,
        mustChangePassword: false
      });

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Yeni sifre ile giris yapilabilmeli
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'newpassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('hatali mevcut sifre ile degistirememeli', async () => {
      const hashedPassword = await bcrypt.hash('oldpassword', 10);
      const user = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: true,
        mustChangePassword: false
      });

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('kisa yeni sifre kabul edilmemeli', async () => {
      const hashedPassword = await bcrypt.hash('oldpassword', 10);
      const user = await User.create({
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: true
      });

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'oldpassword',
          newPassword: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('ilk giris kullanicisi mevcut sifre olmadan degistirebilmeli', async () => {
      const user = await User.create({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: true,
        mustChangePassword: true
      });

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/verify-activation-token/:token', () => {
    it('gecerli token dogrulamali', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await User.create({
        email: 'activate@example.com',
        firstName: 'Activate',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: false,
        activationToken: hashedToken,
        activationTokenExpires: Date.now() + 3600000 // 1 saat
      });

      const response = await request(app)
        .get(`/api/auth/verify-activation-token/${rawToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.email).toBe('activate@example.com');
    });

    it('gecersiz token icin hata donmeli', async () => {
      const response = await request(app)
        .get('/api/auth/verify-activation-token/invalidtoken123')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('suresi dolmus token icin hata donmeli', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await User.create({
        email: 'expired@example.com',
        firstName: 'Expired',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: false,
        activationToken: hashedToken,
        activationTokenExpires: Date.now() - 3600000 // 1 saat once (suresi dolmus)
      });

      const response = await request(app)
        .get(`/api/auth/verify-activation-token/${rawToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/activate-account', () => {
    it('hesap aktive etmeli ve sifre belirlemeli', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await User.create({
        email: 'activate@example.com',
        firstName: 'Activate',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: false,
        activationToken: hashedToken,
        activationTokenExpires: Date.now() + 3600000
      });

      const response = await request(app)
        .post('/api/auth/activate-account')
        .send({
          token: rawToken,
          password: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();

      // Kullanici artik aktif olmali
      const user = await User.findOne({ email: 'activate@example.com' });
      expect(user.isActive).toBe(true);
      expect(user.activationToken).toBeNull();
    });

    it('kisa sifre ile aktive edilememeli', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await User.create({
        email: 'activate2@example.com',
        firstName: 'Activate',
        lastName: 'User',
        role: testRole._id,
        company: testCompany._id,
        isActive: false,
        activationToken: hashedToken,
        activationTokenExpires: Date.now() + 3600000
      });

      const response = await request(app)
        .post('/api/auth/activate-account')
        .send({
          token: rawToken,
          password: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
