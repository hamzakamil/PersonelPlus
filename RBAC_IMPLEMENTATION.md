# RBAC (Role-Based Access Control) Sistemi - Kapsamlı Dokümantasyon

> 🔐 PersonelPlus için merkezi yetkilendirme ve rol tabanlı erişim kontrol sistemi

## 📋 İçindekiler

- [Genel Bakış](#-genel-bakış)
- [Mimari Yapı](#️-mimari-yapı)
- [Veritabanı Modelleri](#-veritabanı-modelleri)
- [Middleware ve Yetki Kontrolü](#-middleware-ve-yetki-kontrolü)
- [API Endpoints](#-api-endpoints)
- [Varsayılan Roller ve Yetkiler](#-varsayılan-roller-ve-yetkiler)
- [Kullanım Kılavuzu](#-kullanım-kılavuzu)
- [Örnekler ve Senaryolar](#-örnekler-ve-senaryolar)
- [Frontend Entegrasyonu](#-frontend-entegrasyonu)
- [Kurulum ve Yapılandırma](#-kurulum-ve-yapılandırma)
- [Sorun Giderme](#-sorun-giderme)
- [Gelecek Geliştirmeler](#-gelecek-geliştirmeler)

## 🎯 Genel Bakış

PersonelPlus RBAC sistemi, aşağıdaki temel özellikleri sağlar:

- ✅ **Esnek Rol Yönetimi**: Sistem rolleri + özel roller
- ✅ **İnce Taneli Yetkiler**: Kaynak ve işlem bazlı yetkilendirme
- ✅ **Bayi Bazlı İzolasyon**: Bayiler arası veri güvenliği
- ✅ **Şirket Bazlı Yetkiler**: Bayi yetkilileri için şirket kapsamlı erişim
- ✅ **Kolay Entegrasyon**: Middleware tabanlı kolay kullanım
- ✅ **Yüksek Performans**: Önbellekleme ve optimize edilmiş sorgular

### 🏗️ RBAC Hiyerarşisi

```
Super Admin
    ├── Tüm sistem yetkileri
    └── Bayi oluşturma/yönetme
        │
        ├── Bayi Admin
        │   ├── Şirket yönetimi
        │   ├── Özel rol oluşturma
        │   └── Bayi Yetkilisi atama
        │       │
        │       ├── Bayi Yetkilisi
        │       │   └── Atanan şirketlerde sınırlı yetkiler
        │       │
        │       └── Şirket Admin
        │           ├── Çalışan yönetimi
        │           ├── Departman yönetimi
        │           └── İzin yönetimi
        │               │
        │               ├── Departman Yöneticisi
        │               │   └── Departman içi yetkiler
        │               │
        │               └── Çalışan
        │                   └── Temel kullanıcı işlemleri
```

## 🏗️ Mimari Yapı

### Katmanlı Mimari

```
┌─────────────────────────────────────────────┐
│           Frontend (Vue.js)                 │
│  • Router Guards                            │
│  • Permission Checks                        │
│  • Role-based UI Components                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           API Layer (Express)               │
│  • Authentication (JWT)                     │
│  • Authorization Middleware                 │
│  • Permission Validation                    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│        Business Logic Layer                 │
│  • hasPermission()                          │
│  • requirePermission()                      │
│  • requireAnyPermission()                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│           Database Layer (MongoDB)          │
│  • User, Role, Permission                   │
│  • RolePermission (Many-to-Many)            │
└─────────────────────────────────────────────┘
```

## 📊 Veritabanı Modelleri

### 1. Permission Model

**Dosya**: `backend/models/Permission.js`

```javascript
{
  name: String,          // Örn: "company:create"
  description: String,   // İnsan okunabilir açıklama
  category: String,      // Kategori: company, employee, leave, vb.
  createdAt: Date,
  updatedAt: Date
}
```

**Yetki İsimlendirme Konvansiyonu:**

- Format: `<kaynak>:<işlem>`
- Örnekler:
  - `company:create` - Şirket oluşturma
  - `employee:view` - Çalışan görüntüleme
  - `leave:approve` - İzin onaylama
  - `system:manage_roles` - Rol yönetimi

**Kategoriler:**

- `company` - Şirket işlemleri
- `employee` - Çalışan işlemleri
- `department` - Departman işlemleri
- `leave` - İzin işlemleri
- `attendance` - Puantaj işlemleri
- `payment` - Ödeme işlemleri
- `report` - Raporlama işlemleri
- `system` - Sistem yönetimi

### 2. Role Model

**Dosya**: `backend/models/Role.js`

```javascript
{
  name: String,            // Rol adı (unique per dealer)
  description: String,     // Rol açıklaması
  isSystemRole: Boolean,   // Sistem rolü mü? (sadece super_admin değiştirebilir)
  dealer: ObjectId,        // Hangi bayiye ait (null = global)
  createdBy: ObjectId,     // Rolü oluşturan kullanıcı
  createdAt: Date,
  updatedAt: Date
}
```

**Sistem Rolleri** (`isSystemRole: true`):

- `super_admin`
- `bayi_admin`
- `company_admin`
- `resmi_muhasebe_ik`
- `employee`

**Özel Roller** (`isSystemRole: false`):

- Bayi adminleri tarafından oluşturulur
- Sadece o bayiye özgüdür
- Örnek: "Bölge Müdürü", "Kıdemli İK Uzmanı"

### 3. RolePermission Model (Join Table)

**Dosya**: `backend/models/RolePermission.js`

```javascript
{
  role: ObjectId,          // Role referansı
  permission: ObjectId,    // Permission referansı
  assignedBy: ObjectId,    // Atayan kullanıcı
  companies: [ObjectId],   // Bayi yetkilisi için: hangi şirketlerde geçerli
  createdAt: Date
}
```

**Önemli**: `companies` alanı sadece bayi yetkilisi rolleri için kullanılır.

## 🛡️ Middleware ve Yetki Kontrolü

### Middleware Fonksiyonları

**Dosya**: `backend/middleware/permissions.js`

#### 1. `requirePermission(permission)`

Tek bir yetki gerektirir.

```javascript
const { requirePermission } = require('../middleware/permissions');

router.post('/companies', auth, requirePermission('company:create'), async (req, res) => {
  // Sadece 'company:create' yetkisi olanlar erişebilir
});
```

#### 2. `requireAnyPermission(...permissions)`

Belirtilen yetkilerden herhangi birine sahip olmayı gerektirir.

```javascript
const { requireAnyPermission } = require('../middleware/permissions');

router.get(
  '/reports',
  auth,
  requireAnyPermission('report:view', 'report:export'),
  async (req, res) => {
    // 'report:view' VEYA 'report:export' yetkisi yeterli
  }
);
```

#### 3. `hasPermission(user, permission, context)`

Helper fonksiyon - Controller içinde kullanım için.

```javascript
const { hasPermission } = require('../middleware/permissions');

async function approveLeave(req, res) {
  const canApprove = await hasPermission(req.user, 'leave:approve', {
    companyId: req.body.companyId,
  });

  if (!canApprove) {
    return res.status(403).json({
      success: false,
      message: 'Bu işlem için yetkiniz yok',
    });
  }

  // İşlemi gerçekleştir
}
```

### Yetki Kontrol Akışı

```
1. İstek gelir
    ↓
2. auth middleware (JWT doğrulama)
    ↓
3. requirePermission middleware
    ↓
4. Super admin mi kontrol et → EVET → Geçir
    ↓ HAYIR
5. Kullanıcının rolleri al
    ↓
6. Her rol için:
   - RolePermission'ları al
   - Yetkiyi kontrol et
   - Bayi yetkilisi ise: şirket kontrolü yap
    ↓
7. Yetki var mı? → EVET → Geçir
    ↓ HAYIR
8. 403 Forbidden döndür
```

## 🌐 API Endpoints

### Yetki Yönetimi (`/api/permissions`)

#### GET `/api/permissions`

Tüm yetkileri listeler (sadece super_admin).

**Yanıt:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "company:create",
      "description": "Şirket oluşturma yetkisi",
      "category": "company"
    }
  ]
}
```

#### POST `/api/permissions`

Yeni yetki oluşturur (sadece super_admin).

**İstek:**

```json
{
  "name": "report:export",
  "description": "Rapor dışa aktarma",
  "category": "report"
}
```

### Rol Yönetimi (`/api/roles`)

#### GET `/api/roles`

Rolleri listeler.

**Yetki:**

- Super admin: Tüm roller
- Bayi admin: Sistem rolleri + kendi bayisinin rolleri

#### POST `/api/roles`

Yeni rol oluşturur.

**İstek:**

```json
{
  "name": "Bölge Müdürü",
  "description": "Bölge düzeyinde yönetim yetkisi",
  "isSystemRole": false
}
```

#### POST `/api/roles/:roleId/permissions`

Role yetki atar veya kaldırır.

**İstek:**

```json
{
  "permissionIds": ["perm1", "perm2"],
  "action": "add", // veya "remove"
  "companies": ["company1", "company2"] // Opsiyonel: bayi yetkilisi için
}
```

## 🔐 Varsayılan Roller ve Yetkiler

### Sistem Rolleri

#### 1. `super_admin`

**Tüm yetkiler** - Hiçbir kontrol yapılmaz, her işlem izin verilir.

#### 2. `bayi_admin`

Bayi yöneticisi.

**Yetkiler:**

- `company:*` (tüm şirket işlemleri)
- `employee:*` (tüm çalışan işlemleri)
- `role:create`, `role:update`, `role:delete` (özel rol yönetimi)
- `subscription:*` (abonelik yönetimi)

#### 3. `bayi_yetkilisi`

Bayi tarafından yetkilendirilmiş kullanıcı. Yetkiler atanır, şirket bazlı çalışır.

**Tipik Yetkiler:**

- `company:view`
- `employee:view`, `employee:create`
- `leave:approve`
- Sadece atanan şirketlerde geçerli

#### 4. `company_admin`

Şirket yöneticisi.

**Yetkiler:**

- `department:*`
- `employee:*`
- `leave:*`
- `attendance:*`
- `working-hours:*`

#### 5. `resmi_muhasebe_ik`

İK ve muhasebe işlemleri.

**Yetkiler:**

- `employee:view`, `employee:update`
- `employment:*` (işe giriş/çıkış)
- `payment:*`
- `report:*`

#### 6. `employee`

Standart çalışan.

**Yetkiler:**

- `leave:request` (izin talep etme)
- `attendance:view` (kendi puantajını görme)
- `profile:view`, `profile:update` (kendi profilini görme/güncelleme)

### Yetki Kategorileri ve Örnekleri

| Kategori       | Yetkiler                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------- |
| **company**    | `company:create`, `company:view`, `company:update`, `company:delete`                        |
| **employee**   | `employee:create`, `employee:view`, `employee:update`, `employee:delete`, `employee:import` |
| **department** | `department:create`, `department:view`, `department:update`, `department:delete`            |
| **leave**      | `leave:request`, `leave:approve`, `leave:view`, `leave:cancel`, `leave:report`              |
| **attendance** | `attendance:create`, `attendance:view`, `attendance:approve`, `attendance:report`           |
| **payment**    | `payment:view`, `payment:create`, `payment:approve`, `payment:export`                       |
| **report**     | `report:view`, `report:export`, `report:dashboard`                                          |
| **system**     | `system:manage_roles`, `system:manage_permissions`, `system:settings`                       |

## 📚 Kullanım Kılavuzu

### Backend'de Yetki Kontrolü

#### Örnek 1: Route'da Middleware ile

```javascript
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requirePermission, requireAnyPermission } = require('../middleware/permissions');

// Tek yetki gerekli
router.post('/companies', auth, requirePermission('company:create'), async (req, res) => {
  // Sadece 'company:create' yetkisi olan kullanıcılar erişebilir
  // ...
});

// Birden fazla yetkiden biri gerekli
router.get(
  '/reports',
  auth,
  requireAnyPermission('report:view', 'report:export'),
  async (req, res) => {
    // 'report:view' VEYA 'report:export' yetkisi yeterli
    // ...
  }
);

// Çoklu yetki kontrolü (hepsi gerekli)
router.post(
  '/sensitive-operation',
  auth,
  requirePermission('operation:execute'),
  requirePermission('operation:sensitive'),
  async (req, res) => {
    // Her iki yetki de gerekli
    // ...
  }
);
```

#### Örnek 2: Controller İçinde Dinamik Kontrol

```javascript
const { hasPermission } = require('../middleware/permissions');

exports.processLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    // Kendi isteğini mi görüntülüyor?
    const isOwn = leaveRequest.employee.toString() === req.user.employeeId?.toString();

    // Onaylama yetkisi var mı?
    const canApprove = await hasPermission(req.user, 'leave:approve', {
      companyId: leaveRequest.company,
    });

    if (!isOwn && !canApprove) {
      return res.status(403).json({
        success: false,
        message: 'Bu izin talebine erişim yetkiniz yok',
      });
    }

    // İşlem devam eder...
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

#### Örnek 3: Koşullu Yetki Kontrolü

```javascript
exports.updateEmployee = async (req, res) => {
  const { employeeId } = req.params;
  const updates = req.body;

  // Maaş güncellemesi mi?
  if (updates.salary) {
    const canUpdateSalary = await hasPermission(req.user, 'employee:update-salary');
    if (!canUpdateSalary) {
      return res.status(403).json({
        success: false,
        message: 'Maaş güncelleme yetkiniz yok',
      });
    }
  }

  // Rol değişikliği mi?
  if (updates.role) {
    const canUpdateRole = await hasPermission(req.user, 'employee:update-role');
    if (!canUpdateRole) {
      return res.status(403).json({
        success: false,
        message: 'Rol güncelleme yetkiniz yok',
      });
    }
  }

  // Güncellemeyi yap...
};
```

### Frontend'de Yetki Kontrolü

#### Örnek 1: Vue Component'te

```vue
<template>
  <div>
    <button v-if="canCreateEmployee" @click="createEmployee">Çalışan Ekle</button>

    <button v-if="canApproveLeave" @click="approveLeave">İzni Onayla</button>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const canCreateEmployee = computed(() => authStore.hasPermission('employee:create'));

const canApproveLeave = computed(() => authStore.hasPermission('leave:approve'));
</script>
```

#### Örnek 2: Router Guard

```javascript
// router/index.js
import { useAuthStore } from '@/stores/auth';

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // Route'un gerektirdiği yetki
  const requiredPermission = to.meta.permission;

  if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
    // Yetki yok, anasayfaya yönlendir
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

// Route tanımı
{
  path: '/companies/create',
  name: 'CompanyCreate',
  component: () => import('@/views/CompanyCreate.vue'),
  meta: {
    requiresAuth: true,
    permission: 'company:create'
  }
}
```

## 💡 Örnekler ve Senaryolar

### Senaryo 1: Bayi Yetkilisi Oluşturma

**Amaç**: Bayi admin, belirli şirketlerde çalışan ekleme yetkisi olan bir yetkili oluşturmak istiyor.

**Adımlar:**

1. Bayi admin olarak giriş yap
2. Yeni rol oluştur:

```javascript
POST /api/roles
{
  "name": "Şirket Yetkilisi - Çalışan Yönetimi",
  "description": "Belirli şirketlerde çalışan ekleme/düzenleme yetkisi",
  "isSystemRole": false
}
```

3. Role yetki ata:

```javascript
POST /api/roles/:roleId/permissions
{
  "permissionIds": [
    "employee:create",
    "employee:view",
    "employee:update",
    "company:view"
  ],
  "action": "add",
  "companies": ["company1Id", "company2Id"]
}
```

4. Kullanıcı oluştur ve bu rolü ata

### Senaryo 2: Departman Yöneticisi İzin Onaylama

**Amaç**: Departman yöneticisi sadece kendi departmanındaki çalışanların izin taleplerini onaylayabilmeli.

**Backend Kontrolü:**

```javascript
exports.approveLeaveRequest = async (req, res) => {
  const { leaveRequestId } = req.params;

  // İzin onaylama yetkisi var mı?
  const canApprove = await hasPermission(req.user, 'leave:approve');
  if (!canApprove) {
    return res.status(403).json({ message: 'Yetki yok' });
  }

  // İzin talebini al
  const leaveRequest = await LeaveRequest.findById(leaveRequestId).populate('employee');

  // Çalışan bu yöneticinin departmanında mı?
  if (leaveRequest.employee.department.toString() !== req.user.department?.toString()) {
    return res.status(403).json({
      message: 'Sadece kendi departmanınızdaki çalışanların izin taleplerini onaylayabilirsiniz',
    });
  }

  // Onaylama işlemi...
};
```

### Senaryo 3: Özel Rol ile Raporlama Yetkisi

**Amaç**: Bir kullanıcıya sadece raporları görüntüleme ve Excel'e aktarma yetkisi vermek.

```javascript
// 1. Rol oluştur
POST /api/roles
{
  "name": "Rapor Görüntüleyici",
  "description": "Sadece raporları görüntüleyebilir ve dışa aktarabilir",
  "isSystemRole": false
}

// 2. Yetkileri ata
POST /api/roles/:roleId/permissions
{
  "permissionIds": [
    "report:view",
    "report:export",
    "dashboard:view"
  ],
  "action": "add"
}
```

## 🎨 Frontend Entegrasyonu

### Auth Store (Pinia)

```javascript
// stores/auth.js
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    permissions: [],
  }),

  getters: {
    hasPermission: state => permission => {
      // Super admin her zaman true
      if (state.user?.role === 'super_admin') return true;

      // Yetki listesinde var mı?
      return state.permissions.includes(permission);
    },

    hasAnyPermission:
      state =>
      (...permissions) => {
        if (state.user?.role === 'super_admin') return true;

        return permissions.some(perm => state.permissions.includes(perm));
      },

    hasAllPermissions:
      state =>
      (...permissions) => {
        if (state.user?.role === 'super_admin') return true;

        return permissions.every(perm => state.permissions.includes(perm));
      },
  },

  actions: {
    async login(credentials) {
      const response = await axios.post('/api/auth/login', credentials);
      this.token = response.data.token;
      this.user = response.data.user;

      // Kullanıcının yetkilerini al
      await this.fetchPermissions();
    },

    async fetchPermissions() {
      const response = await axios.get('/api/users/me/permissions');
      this.permissions = response.data.permissions;
    },
  },
});
```

### Permission Directive

```javascript
// directives/permission.js
export const permissionDirective = {
  mounted(el, binding) {
    const { value } = binding;
    const authStore = useAuthStore();

    if (!authStore.hasPermission(value)) {
      el.parentNode?.removeChild(el);
    }
  },
};

// main.js
app.directive('permission', permissionDirective);

// Kullanım
<button v-permission="'employee:create'">Çalışan Ekle</button>;
```

## ⚙️ Kurulum ve Yapılandırma

### 1. RBAC Sistemini İlklendir

```bash
cd backend
node scripts/initRBAC.js
```

Bu script:

- Varsayılan yetkileri oluşturur
- Sistem rollerini oluşturur veya günceller
- Rollere varsayılan yetkileri atar

### 2. Veritabanı Kontrolleri

```bash
# MongoDB'ye bağlan
mongosh personelplus

# Rolleri kontrol et
db.roles.find().pretty()

# Yetkileri kontrol et
db.permissions.find().pretty()

# Rol-yetki ilişkilerini kontrol et
db.rolepermissions.find().pretty()
```

### 3. Test Kullanıcısı Oluşturma

```javascript
// scripts/createTestUser.js
const User = require('../models/User');
const Role = require('../models/Role');

async function createTestUser() {
  const role = await Role.findOne({ name: 'bayi_admin' });

  const user = await User.create({
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: role._id,
  });

  console.log('Test kullanıcısı oluşturuldu:', user.email);
}

createTestUser();
```

## 🔧 Sorun Giderme

### 1. "Permission denied" Hatası

**Neden**: Kullanıcının gerekli yetkisi yok.

**Çözüm:**

```bash
# Kullanıcının yetkilerini kontrol et
GET /api/users/:userId/permissions

# Rolün yetkilerini kontrol et
GET /api/roles/:roleId/permissions

# Eksik yetki varsa ekle
POST /api/roles/:roleId/permissions
{
  "permissionIds": ["missing-permission-id"],
  "action": "add"
}
```

### 2. Bayi Yetkilisi Şirketlere Erişemiyor

**Neden**: RolePermission'da companies alanı eksik veya yanlış.

**Çözüm:**

```javascript
// RolePermission'ı güncelle
await RolePermission.updateMany(
  { role: bayiYetkilisiRoleId },
  { $set: { companies: [company1Id, company2Id] } }
);
```

### 3. Super Admin Yetki Kontrolünden Geçemiyor

**Neden**: Middleware'de super admin kontrolü eksik.

**Çözüm:**

```javascript
// permissions.js middleware'inde
if (req.user.role === 'super_admin') {
  return next(); // Super admin her zaman geçer
}
```

### 4. Frontend'de Yetki Güncellenmiyor

**Neden**: Token'da eski bilgiler var veya cache sorunu.

**Çözüm:**

```javascript
// Kullanıcıyı yeniden login ettir veya
// Yetkileri manuel yenile
await authStore.fetchPermissions();
```

## 🚀 Gelecek Geliştirmeler

### Planlanan Özellikler

1. **Zaman Bazlı Yetkiler**
   - Belirli tarih aralığında geçerli yetkiler
   - Geçici yetki atamaları

2. **Yetki Şablonları**
   - Hazır yetki setleri
   - Hızlı rol oluşturma

3. **Audit Log**
   - Yetki değişikliklerini loglama
   - Kim, ne zaman, hangi yetkiyi verdi?

4. **Gelişmiş Raporlama**
   - Yetki kullanım istatistikleri
   - Yetkiye göre kullanıcı analizi

5. **Frontend Permission Guard Geliştirmeleri**
   - Otomatik permission-based routing
   - Component-level lazy loading

6. **Performans İyileştirmeleri**
   - Redis cache entegrasyonu
   - Permission caching

## 📁 İlgili Dosyalar

### Backend

- `backend/models/Permission.js` - Yetki modeli
- `backend/models/Role.js` - Rol modeli
- `backend/models/RolePermission.js` - Rol-yetki ilişkisi
- `backend/middleware/permissions.js` - Yetki middleware'leri
- `backend/routes/permissions.js` - Yetki API endpoint'leri
- `backend/routes/roles.js` - Rol API endpoint'leri
- `backend/scripts/initRBAC.js` - RBAC ilklendirme script'i

### Frontend

- `ui/src/views/RoleManagement.vue` - Rol yönetim paneli
- `ui/src/stores/auth.js` - Auth store (yetkiler dahil)
- `ui/src/router/index.js` - Router guard'lar

## 📞 Destek ve Katkı

Sorularınız veya önerileriniz için:

- 📧 Email: dev@personelplus.com
- 🐛 Issue: [GitHub Issues](https://github.com/your-username/PersonelPlus/issues)
- 📖 Dokümantasyon: [README.md](./README.md)

---

> 💡 **İpucu**: RBAC sistemini test etmek için `backend/tests/rbac.test.js` dosyasındaki test senaryolarını çalıştırın.

**Son Güncelleme**: 2026-02-10
