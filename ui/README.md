# PersonelPlus Frontend

> 🎨 Vue 3 ile geliştirilmiş modern, responsive ve performanslı İnsan Kaynakları Yönetim Arayüzü

## 🚀 Hızlı Başlangıç

```bash
# Bağımlılıkları yükle
pnpm install

# Development server
pnpm run dev

# Production build
pnpm run build

# Preview production build
pnpm run preview
```

## 📁 Proje Yapısı

```
ui/
├── public/                 # Statik dosyalar
├── src/
│   ├── assets/            # CSS, resimler, fontlar
│   ├── components/        # Yeniden kullanılabilir bileşenler
│   │   ├── managers/     # Yönetici organizasyon bileşenleri
│   │   └── reports/      # Rapor bileşenleri
│   ├── layouts/          # Layout bileşenleri
│   │   └── DashboardLayout.vue
│   ├── router/           # Vue Router yapılandırması
│   │   └── index.js
│   ├── services/         # API servis katmanı
│   │   └── api.js
│   ├── stores/           # Pinia store'lar (state management)
│   │   ├── auth.js
│   │   ├── company.js
│   │   └── ...
│   ├── utils/            # Yardımcı fonksiyonlar
│   ├── views/            # Sayfa bileşenleri
│   │   ├── bordro/      # Bordro modülü
│   │   ├── employment/  # İşe giriş/çıkış
│   │   └── ...
│   ├── App.vue           # Root component
│   ├── main.js           # Entry point
│   └── style.css         # Global stiller
├── scripts/              # Utility scriptleri
│   ├── generateComponentDocs.js
│   └── analyzeStructure.js
├── tests/                # Test dosyaları
│   └── e2e/             # Playwright E2E testler
├── index.html
├── package.json
├── vite.config.js        # Vite yapılandırması
└── tailwind.config.js    # Tailwind CSS yapılandırması
```

## 🛠️ Teknolojiler

### Core

- **Vue 3** - Progressive JavaScript Framework
- **Vite** - Next Generation Frontend Tooling
- **Pinia** - Vue Store
- **Vue Router** - Official Router for Vue.js

### UI & Styling

- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS preprocessor

### HTTP & API

- **Axios** - Promise based HTTP client

### File Processing

- **XLSX** - Excel dosya okuma/yazma

### Development

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing framework
- **Playwright** - E2E testing framework

## 📚 Temel Konseptler

### Composition API

Proje Vue 3 Composition API kullanır:

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const count = ref(0);

const doubled = computed(() => count.value * 2);

onMounted(() => {
  console.log('Component mounted!');
});
</script>
```

### State Management (Pinia)

```javascript
// stores/auth.js
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
  }),

  getters: {
    isAuthenticated: state => !!state.token,
    userName: state => state.user?.firstName,
  },

  actions: {
    async login(credentials) {
      const response = await api.post('/auth/login', credentials);
      this.token = response.data.token;
      this.user = response.data.user;
    },
  },
});
```

### Routing

```javascript
// router/index.js
const routes = [
  {
    path: '/',
    component: DashboardLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
    ],
  },
];
```

## 🎨 Component Kategorileri

### Views (Sayfalar)

Tam sayfa bileşenleri - route'lara bağlı:

- **Dashboard.vue** - Ana kontrol paneli
- **Companies.vue** - Şirket listesi ve yönetimi
- **Employees.vue** - Çalışan listesi
- **LeaveRequests.vue** - İzin talepleri
- **Puantaj.vue** - Puantaj yönetimi
- **bordro/** - Bordro modülü sayfaları
- **employment/** - İşe giriş/çıkış sayfaları

### Components (Bileşenler)

Yeniden kullanılabilir küçük bileşenler:

#### UI Elements

- **Button.vue** - Özelleştirilmiş button bileşeni
- **Input.vue** - Form input bileşeni
- **Textarea.vue** - Textarea bileşeni
- **PhoneInput.vue** - Telefon numarası input

#### Modals

- **ConfirmModal.vue** - Onay modal'ı
- **SmsVerificationModal.vue** - SMS doğrulama
- **EmploymentMessageModal.vue** - İşe giriş/çıkış mesaj

#### Specialized

- **CheckInButton.vue** - Giriş/çıkış butonu
- **NotificationBadge.vue** - Bildirim rozeti
- **MessageBadge.vue** - Mesaj rozeti
- **ToastContainer.vue** - Toast bildirimleri

### Layouts

Sayfa layout'ları:

- **DashboardLayout.vue** - Ana dashboard layout (sidebar, header, footer)

## 🔐 Authentication Flow

```javascript
// Login
await authStore.login({ email, password });

// Route Guard (router/index.js)
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' });
  } else {
    next();
  }
});

// Axios Interceptor (services/api.js)
api.interceptors.request.use(config => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});
```

## 📡 API Integration

```javascript
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(/* ... */);

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      authStore.logout();
      router.push('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
```

## 🎯 Environment Variables

`.env` dosyası oluştur:

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:3000/api

# App Title
VITE_APP_TITLE=PersonelPlus

# Environment
VITE_ENV=development
```

Kullanım:

```javascript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## 🧪 Testing

### Unit Tests (Vitest)

```bash
# Tüm testleri çalıştır
pnpm test

# Watch mode
pnpm test:watch

# Coverage raporu
pnpm run test:coverage
```

Örnek test:

```javascript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Button from '@/components/Button.vue';

describe('Button', () => {
  it('renders correctly', () => {
    const wrapper = mount(Button, {
      props: { label: 'Click me' },
    });
    expect(wrapper.text()).toBe('Click me');
  });
});
```

### E2E Tests (Playwright)

```bash
# E2E testleri çalıştır
pnpm run test:e2e

# Headed mode (browser görünür)
pnpm run test:e2e:headed

# UI mode (interactive)
pnpm run test:e2e:ui
```

## 🎨 Styling

### Tailwind CSS

Utility-first CSS framework kullanılır:

```vue
<template>
  <div class="flex items-center justify-between p-4 bg-white rounded-lg shadow">
    <h2 class="text-xl font-bold text-gray-800">Title</h2>
    <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Click</button>
  </div>
</template>
```

### Custom Theme

`tailwind.config.js`:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        danger: '#EF4444',
      },
    },
  },
};
```

## 📊 Scripts

### Development

```bash
pnpm run dev          # Development server
pnpm run build        # Production build
pnpm run preview      # Preview production build
```

### Code Quality

```bash
pnpm run lint         # ESLint kontrolü
pnpm run lint:fix     # ESLint otomatik düzeltme
pnpm run format       # Prettier formatla
pnpm run format:check # Prettier kontrolü
```

### Testing

```bash
pnpm test             # Vitest unit tests
pnpm run test:e2e     # Playwright E2E tests
```

### Documentation

```bash
pnpm run docs:generate  # Component dokümantasyonu oluştur
pnpm run docs:analyze   # Proje yapısını analiz et
```

## 🔧 Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

## 📦 Build & Deploy

### Production Build

```bash
pnpm run build
```

Build dosyaları `dist/` klasöründe oluşur.

### Static Hosting

Build dosyalarını herhangi bir static hosting servisine deploy edebilirsiniz:

- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Nginx

### Nginx Örnek Konfigürasyonu

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/personelplus/dist;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## 🐛 Common Issues

### Port Zaten Kullanımda

```bash
# Port değiştir
vite --port 3001
```

veya `vite.config.js`'de:

```javascript
server: {
  port: 3001;
}
```

### API CORS Hatası

Backend'de CORS yapılandırmasını kontrol et veya Vite proxy kullan:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

### Build Hatası

```bash
# node_modules ve dist temizle
rm -rf node_modules dist
pnpm install
pnpm run build
```

## 📖 Best Practices

### Component Naming

- **PascalCase**: Component dosyaları (`Button.vue`, `UserProfile.vue`)
- **camelCase**: JavaScript değişkenler ve fonksiyonlar
- **kebab-case**: CSS class'ları ve HTML attribute'ları

### File Organization

- Component başına bir dosya
- İlgili bileşenleri klasörlerde grupla
- Büyük component'leri alt bileşenlere böl

### State Management

- Local state için `ref` ve `reactive`
- Global state için Pinia store
- Computed values için `computed`

### Performance

- Lazy load route'lar
- Virtual scrolling uzun listeler için
- Image optimization
- Code splitting

## 🔗 İlgili Dokümantasyon

- [Ana README](../README.md)
- [Backend API Documentation](../backend/API_DOCUMENTATION.md)
- [RBAC Implementation](../RBAC_IMPLEMENTATION.md)
- [Component Documentation](./COMPONENT_DOCUMENTATION.md)

## 📞 Destek

- 📧 Email: frontend@personelplus.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/PersonelPlus/issues)

---

**PersonelPlus Frontend** - Modern İK Yönetim Arayüzü
