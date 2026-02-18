# PersonelPlus - Proje Hafızası

> Bu dosya, Claude Code'un her oturumda okuduğu proje bağlam dosyasıdır.

---

## OTURUM BAŞLANGIÇ KONTROL LİSTESİ

> **Her oturumun başında bu adımları takip et:**

1. **İlerleme durumunu kontrol et**: `.claude/PROGRESS.md` dosyasını oku
2. **Aktif fazı belirle**: "Mevcut Durum" bölümüne bak
3. **Devam edilecek işi gör**: "Sonraki Oturum İçin" bölümünü kontrol et
4. **Blokerlayıcıları kontrol et**: Varsa önce onları çöz

### Hızlı Referans Dosyaları
| Dosya | Amaç |
|-------|------|
| `.claude/CLAUDE.md` | Proje yapısı ve kurallar (bu dosya) |
| `.claude/ROADMAP.md` | Faz bazlı yol haritası |
| `.claude/PROGRESS.md` | **İlerleme takibi ve oturum notları** |

---

## Proje Kimliği

- **Proje Adı**: PersonelPlus
- **Dil**: Türkçe
- **Tür**: Multi-tenant SaaS HR Yönetim Platformu
- **Hedef Kitle**: Türk şirketleri ve bayileri

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js, Express.js 4.18.2, MongoDB + Mongoose 8.0.3 |
| Auth | JWT + bcryptjs |
| Frontend | Vue.js 3.3.4 (Composition API), Pinia, Vue Router, Tailwind CSS |
| Build | Vite 5.0.5, pnpm workspace |
| Diğer | Multer, Nodemailer, Iyzipay, PDFKit, XLSX |

---

## Dizin Yapısı

```
/
├── backend/
│   ├── server.js           # Ana giriş (port 3333)
│   ├── models/             # 34 Mongoose modeli
│   ├── routes/             # 33 API route dosyası
│   ├── middleware/         # auth.js, permissions.js
│   ├── services/           # 11 iş mantığı servisi
│   ├── scripts/            # Başlatma scriptleri
│   └── uploads/            # Dosya depolama
│
├── ui/
│   ├── src/
│   │   ├── views/          # 45+ sayfa bileşeni
│   │   ├── components/     # Ortak bileşenler
│   │   ├── layouts/        # DashboardLayout
│   │   ├── stores/         # Pinia stores
│   │   ├── services/       # API servis katmanı
│   │   └── router/         # Route tanımları
│   └── vite.config.js
│
└── .claude/                # Proje hafızası
```

---

## RBAC Sistemi

### Rol Hiyerarşisi (priority sırası)
1. `super_admin` - Sistem yöneticisi
2. `bayi_admin` - Bayi yöneticisi
3. `company_admin` - Şirket yöneticisi
4. `hr_manager` - IK yöneticisi
5. `department_manager` - Departman yöneticisi
6. `employee` - Çalışan

### Yetki Kullanımı
```javascript
router.get('/endpoint', authMiddleware, checkPermission('resource.action'), controller);
```

---

## Onay Zinciri (Approval Chain)

1. **Çalışan** talep oluşturur
2. **Departman Yöneticisi** onaylar/reddeder
3. **Üst Yönetici** (varsa) final onay
4. **Sistem** bakiyeyi günceller

---

## Geliştirme Komutları

```bash
# Backend
cd backend && npm run dev

# Frontend
cd ui && npm run dev

# Veritabanı başlatma
node scripts/initRoles.js
node scripts/initRBAC.js
node scripts/initLeaveTypes.js
```

---

## Kodlama Kuralları

### Backend
- Model dosyaları PascalCase: `User.js`, `LeaveRequest.js`
- Route dosyaları camelCase: `leaveRequests.js`
- Tüm route'lar `/api/` prefix'i ile başlar
- Mongoose schema'ları timestamps ile oluşturulur
- Şirket bazlı sorgularda her zaman `company` filtresi kullanılır

### Frontend
- View dosyaları PascalCase: `LeaveRequests.vue`
- Composition API kullanılır (`<script setup>`)
- Tailwind CSS sınıfları inline kullanılır
- API çağrıları services/ altında toplanır
- State yönetimi için Pinia stores/ kullanılır

### Genel
- Türkçe yorumlar ve değişken isimleri kabul edilir
- Tarih formatı: `YYYY-MM-DD`
- Para birimi: TRY (Türk Lirası)
- Zaman dilimi: Europe/Istanbul

---

## Hızlı Referans

### Kritik Dosya Yolları
- Backend giriş: `backend/server.js`
- Auth middleware: `backend/middleware/auth.js`
- Permission middleware: `backend/middleware/permissions.js`
- Frontend giriş: `ui/src/main.js`
- Auth store: `ui/src/stores/auth.js`
- Router: `ui/src/router/index.js`

### Port Bilgileri
- Backend API: `http://localhost:3333`
- Frontend Dev: `http://localhost:5173`
- MongoDB: `mongodb://localhost:27017`

---

*Detaylı ilerleme için `.claude/PROGRESS.md` dosyasına bakın.*
