/**
 * Swagger/OpenAPI Configuration
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PersonelPlus API',
      version: '1.0.0',
      description: `
## PersonelPlus API Dokümantasyonu

Multi-tenant SaaS HR Yönetim Platformu için RESTful API.

### Özellikler
- 🔐 JWT tabanlı kimlik doğrulama
- 👥 Çok kiracılı (multi-tenant) mimari
- 📋 RBAC (Role-Based Access Control)
- 📅 İzin yönetimi ve onay zinciri
- 💰 Avans ve ödeme yönetimi
- 📊 Raporlama

### Roller
- **super_admin**: Sistem yöneticisi
- **bayi_admin**: Bayi yöneticisi
- **company_admin**: Şirket yöneticisi
- **hr_manager**: İK yöneticisi
- **department_manager**: Departman yöneticisi
- **employee**: Çalışan
      `,
      contact: {
        name: 'API Desteği',
        email: 'api@personelplus.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'http://localhost:3333',
        description: 'Geliştirme sunucusu',
      },
      {
        url: 'https://api.personelplus.com',
        description: 'Üretim sunucusu',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Kimlik doğrulama işlemleri' },
      { name: 'Users', description: 'Kullanıcı yönetimi' },
      { name: 'Companies', description: 'Şirket yönetimi' },
      { name: 'Departments', description: 'Departman yönetimi' },
      { name: 'Employees', description: 'Çalışan yönetimi' },
      { name: 'Leave Types', description: 'İzin türleri yönetimi' },
      { name: 'Leave Requests', description: 'İzin talepleri' },
      { name: 'Advance Requests', description: 'Avans talepleri' },
      { name: 'Attendances', description: 'Puantaj yönetimi' },
      { name: 'Dealers', description: 'Bayi yönetimi' },
      { name: 'Roles', description: 'Rol yönetimi' },
      { name: 'Settings', description: 'Sistem ayarları' },
      { name: 'Workplaces', description: 'İşyeri yönetimi' },
      { name: 'Messages', description: 'Mesajlaşma sistemi' },
      { name: 'Dashboard', description: 'Dashboard özet bilgileri' },
      { name: 'Check-ins', description: 'Giriş/çıkış takibi' },
      { name: 'Leave Balances', description: 'İzin bakiyeleri' },
      { name: 'Working Hours', description: 'Çalışma saatleri' },
      { name: 'Overtime Requests', description: 'Fazla mesai talepleri' },
      { name: 'Company Holidays', description: 'Şirket tatil takvimleri' },
      { name: 'Subscriptions', description: 'Bayi abonelikleri' },
      { name: 'Permissions', description: 'Yetki yönetimi' },
      { name: 'Packages', description: 'Abonelik paketleri' },
      { name: 'Payments', description: 'Ödeme işlemleri' },
      { name: 'SGK Meslek Kodlari', description: 'SGK meslek kodları' },
      { name: 'Global Settings', description: 'Global sistem ayarları' },
      { name: 'Admin', description: 'Admin yönetim araçları' },
      { name: 'Puantaj', description: 'Puantaj şablon ve kod yönetimi' },
      { name: 'Invoices', description: 'E-fatura yönetimi' },
      { name: 'Commissions', description: 'Komisyon yönetimi' },
      { name: 'Campaigns', description: 'Kampanya yönetimi' },
      { name: 'Weekend Settings', description: 'Hafta tatili ayarları' },
      { name: 'WhatsApp', description: 'WhatsApp entegrasyonu' },
      { name: 'Attendance Templates', description: 'Devam/devamsızlık şablonları' },
      { name: 'Leave Ledger', description: 'İzin cetveli yönetimi' },
      { name: 'Additional Payment Types', description: 'Ek ödeme türleri' },
      { name: 'Yearly Tax Limits', description: 'Yıllık vergi limitleri' },
      { name: 'Managers', description: 'Yönetici atama ve organizasyon yönetimi' },
      { name: 'Quota', description: 'Kota yönetimi' },
      { name: 'Support', description: 'Destek talepleri' },
      { name: 'Requests', description: 'Talepler (izin, işe giriş/çıkış)' },
      { name: 'Leaves', description: 'İzin hakediş hesaplama' },
      { name: 'Employee Payments', description: 'Çalışan ödeme atamaları' },
      { name: 'Company Payment Types', description: 'Şirket ödeme türleri' },
      { name: 'Working Permits', description: 'Çalışma izin türleri' },
      { name: 'Employment', description: 'İşe giriş/çıkış işlemleri' },
      { name: 'Company Subscriptions', description: 'Bayi - Şirket arası abonelik yönetimi' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            "JWT token ile kimlik doğrulama. Login endpoint'inden alınan token kullanılır.",
        },
      },
      schemas: {
        // Ortak Şemalar
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Bir hata oluştu',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
            },
            message: {
              type: 'string',
            },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        // Auth Şemaları
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@sirket.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'sifre123',
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    company: { type: 'object' },
                  },
                },
              },
            },
            message: { type: 'string', example: 'Giriş başarılı' },
          },
        },
        // Department Şemaları
        Department: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Yazılım Geliştirme' },
            description: { type: 'string', example: 'Yazılım geliştirme departmanı' },
            company: { type: 'string', example: '507f1f77bcf86cd799439012' },
            manager: { type: 'string', example: '507f1f77bcf86cd799439013' },
            isActive: { type: 'boolean', example: true },
            isDefault: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        DepartmentCreate: {
          type: 'object',
          required: ['name', 'company'],
          properties: {
            name: { type: 'string', example: 'Yazılım Geliştirme' },
            description: { type: 'string', example: 'Yazılım geliştirme departmanı' },
            company: { type: 'string', example: '507f1f77bcf86cd799439012' },
            manager: { type: 'string', example: '507f1f77bcf86cd799439013' },
          },
        },
        // Employee Şemaları
        Employee: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            firstName: { type: 'string', example: 'Ahmet' },
            lastName: { type: 'string', example: 'Yılmaz' },
            email: { type: 'string', example: 'ahmet.yilmaz@sirket.com' },
            tcKimlikNo: { type: 'string', example: '12345678901' },
            phone: { type: 'string', example: '05321234567' },
            department: { type: 'string' },
            company: { type: 'string' },
            hireDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
            salary: { type: 'number', example: 25000 },
          },
        },
        // Leave Request Şemaları
        LeaveRequest: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            employee: { type: 'string' },
            leaveType: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            totalDays: { type: 'number' },
            reason: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] },
            approvalChain: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  approver: { type: 'string' },
                  status: { type: 'string' },
                  comment: { type: 'string' },
                  date: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Kimlik doğrulama başarısız',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Geçersiz veya süresi dolmuş token',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Yetki hatası',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Bu işlem için yetkiniz yok',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Kaynak bulunamadı',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Kayıt bulunamadı',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation hatası',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                message: 'Validation hatası',
                errors: [{ field: 'email', message: 'Geçerli bir email adresi giriniz' }],
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js', './docs/*.yaml'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
