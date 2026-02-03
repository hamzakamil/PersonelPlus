# RBAC (Role-Based Access Control) Sistemi - Uygulama Dokümantasyonu

## 📋 Genel Bakış

Bu dokümantasyon, projeye eklenen merkezi yetkilendirme sisteminin (RBAC) teknik detaylarını içerir.

## 🏗️ Mimari Yapı

### 1. Veritabanı Modelleri

#### `Permission` Modeli (`backend/models/Permission.js`)
- **Amaç**: Sistemdeki tüm yetkileri tanımlar
- **Alanlar**:
  - `name`: Yetki adı (örn: `company:create`)
  - `description`: Yetki açıklaması
  - `category`: Yetki kategorisi (`company`, `employee`, `attendance`, `leave`, `system`)

#### `Role` Modeli (`backend/models/Role.js`) - Güncellendi
- **Değişiklikler**:
  - `enum` kısıtlaması kaldırıldı (esnek rol oluşturma için)
  - `isSystemRole`: Sistem rolleri vs özel rolleri ayırt eder
  - `dealer`: Bayi yetkilisi için hangi bayiye ait
  - `createdBy`: Rolü oluşturan kullanıcı

#### `RolePermission` Modeli (`backend/models/RolePermission.js`) - Yeni
- **Amaç**: Roller ve yetkiler arası ilişkiyi yönetir
- **Alanlar**:
  - `role`: Rol referansı
  - `permission`: Yetki referansı
  - `assignedBy`: Bayi tarafından atanmışsa bayi admin referansı
  - `companies`: Bayi yetkilisi için hangi şirketlerde geçerli

### 2. Middleware

#### `requirePermission` (`backend/middleware/permissions.js`)
- **Amaç**: Belirli bir yetkiye sahip olma kontrolü
- **Kullanım**: `router.get('/endpoint', auth, requirePermission('leave:approve'), handler)`
- **Özellikler**:
  - Super admin her zaman geçer
  - Bayi yetkilisi için şirket bazlı kontrol

#### `requireAnyPermission`
- **Amaç**: Birden fazla yetkiden birine sahip olma kontrolü

#### `hasPermission` (Helper Function)
- **Amaç**: Middleware olmadan yetki kontrolü (kod içinde kullanım)

### 3. API Endpoints

#### `/api/permissions` - Yetki Yönetimi
- `GET /`: Tüm yetkileri listele (sadece super_admin)
- `POST /`: Yeni yetki oluştur (sadece super_admin)
- `PUT /:id`: Yetki güncelle (sadece super_admin)
- `DELETE /:id`: Yetki sil (sadece super_admin)

#### `/api/roles` - Rol Yönetimi
- `GET /`: Rolleri listele (super_admin: tümü, bayi_admin: sistem + kendi rolleri)
- `GET /:id`: Rol detayı ve yetkileri
- `POST /`: Yeni rol oluştur (super_admin, bayi_admin)
- `PUT /:id`: Rol güncelle
- `DELETE /:id`: Rol sil
- `POST /:id/permissions`: Role yetki ata/kaldır

### 4. Frontend

#### `RoleManagement.vue` - Yetki Yönetim Paneli
- **Konum**: `ui/src/views/RoleManagement.vue`
- **Erişim**: Super Admin ve Bayi Admin
- **Özellikler**:
  - Rol listeleme
  - Rol oluşturma/düzenleme/silme
  - Rollere yetki atama/kaldırma
  - Kategori bazlı yetki görüntüleme

## 🔐 Varsayılan Roller ve Yetkiler

### Roller
1. **super_admin**: Sistemin tamamını yönetir
2. **bayi_admin**: Kendi şirketlerini ve çalışanlarını yönetir
3. **bayi_yetkilisi**: Bayi tarafından yetkilendirilen kullanıcı (yeni)
4. **company_admin**: Şirket yönetimi
5. **resmi_muhasebe_ik**: Resmi muhasebe/İK işlemleri
6. **employee**: Çalışan

### Varsayılan Yetkiler
- `company:create`, `company:view`, `company:update`, `company:delete`
- `employee:create`, `employee:view`, `employee:update`, `employee:delete`
- `attendance:approve`, `attendance:view`
- `leave:approve`, `leave:request`, `leave:view`
- `system:manage_roles`, `system:manage_permissions`

## 📝 Kullanım Örnekleri

### Backend'de Yetki Kontrolü

```javascript
// Tek yetki kontrolü
router.post('/approve', auth, requirePermission('leave:approve'), handler);

// Birden fazla yetkiden biri
router.get('/list', auth, requireAnyPermission('leave:view', 'leave:approve'), handler);

// Kod içinde kontrol
const { hasPermission } = require('../middleware/permissions');
if (await hasPermission(req.user, 'company:create')) {
  // İşlem yap
}
```

### Frontend'de Yetki Kontrolü

```javascript
// Router guard (şimdilik role-based, backend'de permission kontrolü yapılıyor)
// İleride permission-based guard eklenebilir
```

## 🚀 Kurulum ve Başlatma

### 1. RBAC Sistemini Initialize Et

```bash
cd backend
node scripts/initRBAC.js
```

Bu script:
- Varsayılan yetkileri oluşturur
- Varsayılan rolleri oluşturur/günceller
- Rollere varsayılan yetkileri atar

### 2. Backend ve Frontend'i Başlat

```bash
# Backend
cd backend
npm run dev

# Frontend
cd ui
npm run dev
```

## 🔄 Mevcut Sistemle Uyumluluk

- **Geriye Dönük Uyumluluk**: Mevcut role-based kontroller korundu
- **Kademeli Geçiş**: Permission kontrolü yeni endpoint'lere eklendi, eski endpoint'ler çalışmaya devam ediyor
- **Kırılma Yok**: Mevcut kodlar çalışmaya devam ediyor

## 📌 Önemli Notlar

1. **Sistem Rolleri**: `isSystemRole: true` olan roller sadece super_admin tarafından yönetilebilir
2. **Bayi Yetkilisi**: Bayi admin tarafından oluşturulan özel roller, şirket bazlı yetki ataması yapılabilir
3. **Super Admin**: Her zaman tüm yetkilere sahiptir, kontrol edilmez
4. **Yetki Kategorileri**: Yetkiler kategorilere ayrılmıştır (UI'da gruplama için)

## 🔮 Gelecek Geliştirmeler

1. Frontend router guard'ı permission-based yapılabilir
2. Yetki geçmişi (audit log) eklenebilir
3. Zaman bazlı yetki ataması (temporary permissions) eklenebilir
4. Yetki şablonları (permission templates) oluşturulabilir

## 📁 Oluşturulan/Güncellenen Dosyalar

### Backend
- `backend/models/Permission.js` (Yeni)
- `backend/models/RolePermission.js` (Yeni)
- `backend/models/Role.js` (Güncellendi)
- `backend/middleware/permissions.js` (Yeni)
- `backend/routes/permissions.js` (Yeni)
- `backend/routes/roles.js` (Yeni)
- `backend/scripts/initRBAC.js` (Yeni)
- `backend/server.js` (Güncellendi - route'lar eklendi)
- `backend/routes/leaveRequests.js` (Güncellendi - permission kontrolü eklendi)
- `backend/routes/employment.js` (Güncellendi - permission kontrolü eklendi)

### Frontend
- `ui/src/views/RoleManagement.vue` (Yeni)
- `ui/src/router/index.js` (Güncellendi - route eklendi)
- `ui/src/layouts/DashboardLayout.vue` (Güncellendi - menü eklendi)

## ✅ Test Senaryosu

1. **Admin → Yeni Bayi Ekle**
2. **Bayi İçin Yetkili Oluştur** (bayi_yetkilisi rolü)
3. **Yetki Ataması** (bayi_yetkilisi'ne şirket bazlı yetkiler)
4. **Bayi Yetkilisi Girişi**
5. **Çalışan Ekle** (yetki kontrolü)
6. **Çalışan İzin Talebi**
7. **Onay** (yetki kontrolü)

## 🐛 Bilinen Sınırlamalar

1. Frontend router guard şimdilik role-based (backend'de permission kontrolü yapılıyor)
2. Bayi yetkilisi için şirket bazlı yetki ataması UI'da henüz tam entegre değil (backend hazır)

