# PersonelPlus - Personel Yönetim Sistemi

> 🚀 Modern, ölçeklenebilir ve çok kiracılı (multi-tenant) SaaS İnsan Kaynakları Yönetim Platformu

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x-brightgreen.svg)](https://vuejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

## 📋 İçindekiler

- [Genel Bakış](#-genel-bakış)
- [Özellikler](#-özellikler)
- [Teknoloji Stack](#-teknoloji-stack)
- [Sistem Gereksinimleri](#-sistem-gereksinimleri)
- [Kurulum](#-kurulum)
- [Proje Yapısı](#-proje-yapısı)
- [Kullanım](#-kullanım)
- [API Dokümantasyonu](#-api-dokümantasyonu)
- [Geliştirme](#-geliştirme)
- [Test](#-test)
- [Deployment](#-deployment)
- [Katkıda Bulunma](#-katkıda-bulunma)

## 🎯 Genel Bakış

PersonelPlus, süper admin, bayi ve şirket yönetimi için geliştirilmiş kapsamlı bir personel ve insan kaynakları yönetim sistemidir. Multi-tenant mimarisi sayesinde birden fazla bayi ve şirketin bağımsız olarak yönetilmesini sağlar.

### Temel Konseptler

- **Super Admin**: Tüm sistemi yönetir, bayileri oluşturur ve sistemi kontrol eder
- **Bayi (Dealer)**: Birden fazla şirketi yönetir, şirket hesapları oluşturur
- **Şirket (Company)**: Departmanları, çalışanları ve izin süreçlerini yönetir
- **Çalışan (Employee)**: İzin talepleri oluşturur, kendi bilgilerine erişir

## ✨ Özellikler

### 🔐 Kimlik Doğrulama ve Yetkilendirme

- JWT tabanlı güvenli kimlik doğrulama
- Role-Based Access Control (RBAC) sistemi
- Özel rol ve yetki tanımlama
- Çoklu oturum yönetimi

### 🏢 Organizasyon Yönetimi

- Bayi yönetimi ve paketleme sistemi
- Şirket profilleri ve özelleştirme
- Departman ve işyeri yönetimi
- Organizasyon hiyerarşisi

### 👥 İnsan Kaynakları

- Çalışan bilgileri yönetimi
- İşe giriş/çıkış süreçleri
- Sözleşme ve kıdem tazminatı takibi
- Excel'den toplu çalışan aktarımı
- Yönetici atamaları

### 📅 İzin Yönetimi

- Varsayılan ve özel izin türleri
- İzin talep oluşturma ve onay zinciri
- İzin bakiyesi ve hakediş hesaplama
- İzin cetveli raporları
- Otomatik izin hesaplama

### ⏰ Puantaj ve Devam Sistemi

- Çalışma saatleri yönetimi
- Giriş/çıkış takibi
- Puantaj şablonları
- Otomatik puantaj hesaplama
- Devam/devamsızlık raporları
- Fazla mesai yönetimi

### 💰 Bordro ve Ödeme

- Bordro hesaplama ve yönetimi
- Ek ödeme türleri tanımlama
- Çalışan ödemelerini toplu atama
- Avans talepleri
- Vergi limitleri takibi
- Komisyon ve kampanya yönetimi

### 📊 Raporlama ve Dashboard

- Gerçek zamanlı dashboard istatistikleri
- Departman bazlı raporlar
- İzin ve devam raporları
- Excel export özelliği
- Özelleştirilebilir raporlar

### 💳 Abonelik ve Faturalandırma

- Paket yönetimi
- Bayi abonelikleri
- Şirket-bayi abonelik ilişkisi
- E-fatura entegrasyonu
- Ödeme takibi

### 📱 İletişim ve Bildirimler

- Dahili mesajlaşma sistemi
- E-posta bildirimleri
- WhatsApp entegrasyonu (isteğe bağlı)
- Destek talep sistemi
- Bildirim merkezi

### ⚙️ Sistem Ayarları

- Şirket özelleştirmeleri (logo, başlık)
- Global sistem ayarları
- Tatil takvimi yönetimi
- Hafta sonu ayarları
- SGK meslek kodları entegrasyonu

## 🛠️ Teknoloji Stack

### Backend

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **File Upload**: Multer
- **Excel**: XLSX
- **PDF**: PDFKit, PDF-Lib, docx
- **Email**: Nodemailer
- **Payment**: Iyzipay
- **API Docs**: Swagger (swagger-jsdoc, swagger-ui-express)
- **Testing**: Jest, Supertest
- **Code Quality**: ESLint, Prettier
- **Encryption**: bcryptjs, node-forge

### Frontend

- **Framework**: Vue.js 3 (Composition API)
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **HTTP Client**: Axios
- **UI Framework**: Tailwind CSS
- **Build Tool**: Vite
- **Testing**: Vitest, Playwright
- **Code Quality**: ESLint, Prettier

### DevOps & Tools

- **Version Control**: Git
- **Package Manager**: pnpm (workspaces)
- **Process Manager**: PM2 (production)
- **Git Hooks**: Husky
- **Pre-commit**: lint-staged
- **CI/CD**: GitHub Actions (opsiyonel)

## 📦 Sistem Gereksinimleri

- **Node.js**: v20.0.0 veya üzeri (v21'den düşük)
- **pnpm**: Global kurulum gerekli
- **MongoDB**: v5.0 veya üzeri
- **RAM**: Minimum 4GB (Geliştirme için 8GB önerilir)
- **Disk**: Minimum 2GB boş alan

## 🚀 Kurulum

### 1. Repository'yi Klonlayın

```bash
git clone https://github.com/your-username/PersonelPlus.git
cd PersonelPlus
```

### 2. Node.js Versiyonunu Kontrol Edin

```bash
node --version  # v20.x.x olmalı
```

Eğer Node.js 20.x yoksa, [nvm](https://github.com/nvm-sh/nvm) kullanarak yükleyin:

```bash
nvm install 20
nvm use 20
```

### 3. pnpm'i Global Olarak Yükleyin

```bash
npm install -g pnpm
```

### 4. Root Bağımlılıklarını Yükleyin

```bash
pnpm install
```

### 5. Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
pnpm install

# .env dosyasını oluştur
cp .env.example .env

# .env dosyasını düzenle (MongoDB URI, JWT secret, vb.)
# Not: .env.example dosyasındaki açıklamaları okuyun
```

#### Backend .env Örnek Yapılandırma

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/personelplus

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# SMTP (E-posta)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=PersonelPlus <noreply@personelplus.com>

# File Upload
MAX_FILE_SIZE=5242880

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

#### Rol ve Yetkileri İlklendir

```bash
# RBAC sistemini başlat
node scripts/initRBAC.js

# Veya sadece rolleri başlat
node scripts/initRoles.js
```

**Varsayılan Super Admin Bilgileri:**

- Email: `admin@admin.com`
- Şifre: `admin123`

⚠️ **Önemli**: Üretim ortamında bu bilgileri mutlaka değiştirin!

### 6. Frontend Kurulumu

```bash
cd ../ui

# Bağımlılıkları yükle
pnpm install

# .env dosyasını oluştur (opsiyonel)
cp .env.example .env
```

#### Frontend .env Örnek Yapılandırma

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 7. Uygulamayı Başlatın

#### Development Modu

Terminal 1 - Backend:

```bash
cd backend
pnpm run dev
```

Terminal 2 - Frontend:

```bash
cd ui
pnpm run dev
```

Backend: `http://localhost:3000`
Frontend: `http://localhost:5173`
API Docs: `http://localhost:3000/api-docs`

## 📁 Proje Yapısı

```
PersonelPlus/
├── backend/                    # Backend (Node.js + Express)
│   ├── assets/                # Statik dosyalar (şablonlar, vb.)
│   ├── config/                # Yapılandırma dosyaları
│   │   └── swagger.js         # Swagger/OpenAPI config
│   ├── docs/                  # API dokümantasyonu (YAML)
│   ├── jobs/                  # Zamanlanmış görevler
│   ├── middleware/            # Express middleware'ler
│   │   ├── auth.js           # JWT authentication
│   │   ├── permissions.js    # RBAC authorization
│   │   ├── roleCheck.js      # Role-based checks
│   │   └── errorHandler.js   # Global error handling
│   ├── models/                # Mongoose şemaları
│   │   ├── User.js
│   │   ├── Company.js
│   │   ├── Employee.js
│   │   ├── Role.js
│   │   ├── Permission.js
│   │   └── ...
│   ├── routes/                # API route'ları
│   │   ├── auth.js
│   │   ├── companies.js
│   │   ├── employees.js
│   │   └── ...
│   ├── scripts/               # Bakım ve seed scriptleri
│   │   ├── initRBAC.js       # RBAC ilklendirme
│   │   ├── generateApiDocs.js # API dok. oluşturma
│   │   └── validateApiDocs.js # API dok. doğrulama
│   ├── services/              # Business logic katmanı
│   ├── tests/                 # Test dosyaları
│   │   ├── unit/             # Birim testler
│   │   └── integration/      # Entegrasyon testleri
│   ├── uploads/               # Yüklenen dosyalar
│   ├── utils/                 # Yardımcı fonksiyonlar
│   ├── validations/           # Joi validation şemaları
│   ├── .env.example          # Örnek environment değişkenleri
│   ├── server.js             # Express app entry point
│   └── package.json
├── ui/                        # Frontend (Vue.js 3)
│   ├── public/               # Statik dosyalar
│   ├── src/
│   │   ├── assets/          # CSS, resimler, vb.
│   │   ├── components/      # Vue bileşenleri
│   │   ├── layouts/         # Layout bileşenleri
│   │   ├── router/          # Vue Router config
│   │   ├── stores/          # Pinia store'ları
│   │   ├── utils/           # Yardımcı fonksiyonlar
│   │   ├── views/           # Sayfa bileşenleri
│   │   ├── App.vue          # Root bileşen
│   │   └── main.js          # Vue app entry point
│   ├── tests/               # Test dosyaları
│   │   └── e2e/            # Playwright E2E testler
│   └── package.json
├── uploads/                  # Paylaşılan upload klasörü
├── .gitignore
├── package.json              # Root package.json (workspaces)
├── pnpm-workspace.yaml       # pnpm workspace config
├── README.md                 # Bu dosya
└── RBAC_IMPLEMENTATION.md    # RBAC detaylı dokümantasyon
```

## 📖 Kullanım

### İlk Giriş

1. Frontend'e gidin: `http://localhost:5173`
2. Varsayılan super admin ile giriş yapın:
   - Email: `admin@admin.com`
   - Şifre: `admin123`

### Temel İş Akışı

#### Super Admin

1. Dashboard'dan "Bayiler" sayfasına gidin
2. Yeni bayi oluşturun
3. Bayi için paket ataması yapın

#### Bayi Admin

1. Bayi hesabıyla giriş yapın
2. "Şirketler" sayfasından yeni şirket ekleyin
3. Şirket için bayi aboneliği oluşturun

#### Şirket Admin

1. Şirket hesabıyla giriş yapın
2. Departman oluşturun
3. Çalışan ekleyin (manuel veya Excel'den toplu)
4. İzin türlerini yapılandırın
5. Çalışma saatlerini ayarlayın

#### Çalışan

1. Kullanıcı adı ile giriş yapın
2. Dashboard'dan izin bakiyenizi görüntüleyin
3. İzin talebi oluşturun
4. Talep durumunu takip edin

## 📚 API Dokümantasyonu

### Swagger UI

Backend çalışırken Swagger UI'a erişin:

```
http://localhost:3000/api-docs
```

### Otomatik Dokümantasyon Oluşturma

API dokümantasyonunu otomatik olarak oluşturmak için:

```bash
cd backend
node scripts/generateApiDocs.js
```

Bu komut `backend/API_DOCUMENTATION.md` dosyasını oluşturur.

### Dokümantasyon Doğrulama

API dokümantasyonunu doğrulamak için:

```bash
cd backend
node scripts/validateApiDocs.js
```

Bu script eksik veya tutarsız dokümantasyonları tespit eder.

## 🔧 Geliştirme

### Code Style

Proje ESLint ve Prettier kullanır. Kod yazmadan önce:

```bash
# Backend
cd backend
pnpm run lint        # Lint kontrolü
pnpm run lint:fix    # Otomatik düzeltme
pnpm run format      # Prettier formatla

# Frontend
cd ui
pnpm run lint
pnpm run lint:fix
pnpm run format
```

### Git Hooks

Husky ve lint-staged ile pre-commit hooks aktiftir:

- Commit öncesi ESLint çalışır
- Commit öncesi Prettier formatlar
- Hatalı kod commit edilemez

### Database Scriptleri

```bash
cd backend

# Rolleri ilklendir
node scripts/initRoles.js

# RBAC sistemini ilklendir
node scripts/initRBAC.js

# Ek ödeme türlerini ilklendir
node scripts/initAdditionalPaymentTypes.js

# SGK meslek kodlarını import et
node scripts/importSgkMeslekKodlari.js

# Paket seed'leme
node scripts/seedPackages.js
```

## 🧪 Test

### Backend Tests

```bash
cd backend

# Tüm testleri çalıştır
pnpm test

# Birim testler
pnpm run test:unit

# Entegrasyon testleri
pnpm run test:integration

# Watch mode
pnpm run test:watch

# Coverage raporu
pnpm run test:coverage
```

### Frontend Tests

```bash
cd ui

# Birim testler (Vitest)
pnpm test
pnpm run test:run        # Single run
pnpm run test:coverage   # Coverage raporu

# E2E testler (Playwright)
pnpm run test:e2e              # Headless
pnpm run test:e2e:headed       # Browser görünür
pnpm run test:e2e:ui           # Playwright UI
```

## 🚢 Deployment

### Production Build

#### Backend

```bash
cd backend
NODE_ENV=production node server.js
```

#### Frontend

```bash
cd ui
pnpm run build
```

Build dosyaları `ui/dist/` klasörüne oluşturulur.

### Environment Variables

Production'da mutlaka güncellenmelidir:

- `JWT_SECRET`: Güçlü bir secret key
- `MONGODB_URI`: Production MongoDB bağlantısı
- `SMTP_*`: Production email ayarları
- `NODE_ENV=production`

### PM2 ile Production (Önerilen)

```bash
# PM2'yi global yükle
npm install -g pm2

# Backend'i başlat
cd backend
pm2 start server.js --name "personelplus-backend"

# Frontend static files için nginx veya servis kullanın

# PM2 monitoring
pm2 monit

# Logs
pm2 logs personelplus-backend
```

### Docker (Opsiyonel)

Docker yapılandırması için proje ihtiyaçlarına göre Dockerfile ve docker-compose.yml oluşturulabilir.

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen şu adımları izleyin:

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

### Commit Mesaj Formatı

Conventional Commits kullanıyoruz:

- `feat:` Yeni özellik
- `fix:` Bug düzeltme
- `docs:` Dokümantasyon
- `style:` Code style değişiklikleri
- `refactor:` Refactoring
- `test:` Test ekleme/güncelleme
- `chore:` Bakım işleri

## 📄 Lisans

ISC License

## 🆘 Destek

- 📧 Email: support@personelplus.com
- 📖 Dokümantasyon: [/docs](./docs)
- 🐛 Issue: [GitHub Issues](https://github.com/your-username/PersonelPlus/issues)

## 🔗 İlgili Dokümantasyon

- [RBAC Implementation Guide](./RBAC_IMPLEMENTATION.md)
- [API Documentation](./backend/API_DOCUMENTATION.md)
- [Swagger API Docs](http://localhost:3000/api-docs)

---

**PersonelPlus** ile insan kaynakları yönetimini kolaylaştırın! 🚀
