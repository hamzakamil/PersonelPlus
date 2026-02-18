/**
 * API Documentation Generator
 *
 * Bu script, mevcut route'ları ve Swagger YAML dosyalarını analiz ederek
 * Markdown formatında kapsamlı bir API dokümantasyonu oluşturur.
 *
 * Kullanım: node scripts/generateApiDocs.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROUTES_DIR = path.join(__dirname, '../routes');
const DOCS_DIR = path.join(__dirname, '../docs');
const OUTPUT_FILE = path.join(__dirname, '../API_DOCUMENTATION.md');

// Route dosyalarını analiz et
function analyzeRouteFiles() {
  const routes = [];
  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(ROUTES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Route tanımlarını bul (basit regex ile)
    const routeMatches = content.matchAll(
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/gi
    );

    const routeName = file.replace('.js', '');
    const endpoints = [];

    for (const match of routeMatches) {
      const method = match[1].toUpperCase();
      const path = match[2];
      endpoints.push({ method, path, file: routeName });
    }

    if (endpoints.length > 0) {
      routes.push({
        name: routeName,
        file,
        endpoints,
      });
    }
  }

  return routes;
}

// YAML dosyalarından bilgi al
function loadYamlDocs() {
  const docs = {};

  if (!fs.existsSync(DOCS_DIR)) {
    console.warn(`⚠️  Docs klasörü bulunamadı: ${DOCS_DIR}`);
    return docs;
  }

  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.yaml'));

  for (const file of files) {
    try {
      const filePath = path.join(DOCS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const yamlData = yaml.load(content);

      const docName = file.replace('.yaml', '');
      docs[docName] = yamlData;
    } catch (error) {
      console.error(`❌ YAML parse hatası (${file}):`, error.message);
    }
  }

  return docs;
}

// Kategorilere göre route'ları grupla
function categorizeRoutes(routes) {
  const categories = {
    'Kimlik Doğrulama': ['auth'],
    'Kullanıcı Yönetimi': ['users', 'roles', 'permissions'],
    Organizasyon: ['dealers', 'companies', 'departments', 'workplaces'],
    'Çalışan İşlemleri': ['employees', 'employment', 'managers'],
    'İzin Yönetimi': ['leave-types', 'leave-requests', 'leave-balances', 'leave-ledger', 'leaves'],
    'Puantaj ve Devam': [
      'attendances',
      'attendance-templates',
      'check-ins',
      'working-hours',
      'working-permits',
      'attendance-summary',
    ],
    'Fazla Mesai ve Avans': ['overtime-requests', 'advance-requests'],
    'Bordro ve Ödemeler': [
      'bordro',
      'employee-payments',
      'additional-payment-types',
      'company-payment-types',
      'yearly-tax-limits',
    ],
    'Tatiller ve Ayarlar': ['company-holidays', 'weekend-settings', 'settings', 'global-settings'],
    'Abonelik ve Ödemeler': [
      'packages',
      'subscriptions',
      'company-subscriptions',
      'payments',
      'invoices',
    ],
    'Komisyon ve Kampanyalar': ['commissions', 'campaigns'],
    İletişim: ['messages', 'notifications', 'whatsapp', 'support'],
    Raporlama: ['dashboard', 'puantaj', 'requests', 'quota'],
    Sistem: ['admin', 'sgk-meslek-kodlari'],
  };

  const categorized = {};
  const uncategorized = [];

  for (const route of routes) {
    let found = false;
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => route.name.toLowerCase().includes(keyword))) {
        if (!categorized[category]) {
          categorized[category] = [];
        }
        categorized[category].push(route);
        found = true;
        break;
      }
    }
    if (!found) {
      uncategorized.push(route);
    }
  }

  return { categorized, uncategorized };
}

// Markdown dokümantasyonu oluştur
function generateMarkdown(routes, yamlDocs) {
  const { categorized, uncategorized } = categorizeRoutes(routes);

  let md = `# PersonelPlus API Documentation

> 🚀 Otomatik oluşturulma tarihi: ${new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}

## 📋 İçindekiler

`;

  // İçindekiler tablosu
  for (const category of Object.keys(categorized)) {
    md += `- [${category}](#${category.toLowerCase().replace(/\s+/g, '-').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')})\n`;
  }

  md += `\n## 🌐 Base URL

\`\`\`
Development: http://localhost:3333
Production:  https://api.personelplus.com
\`\`\`

## 🔐 Authentication

Tüm API istekleri (login hariç) JWT token ile doğrulanır.

**Header:**
\`\`\`
Authorization: Bearer <token>
\`\`\`

**Token Alma:**
\`\`\`http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

## 📊 Standart Yanıt Formatı

### Başarılı Yanıt
\`\`\`json
{
  "success": true,
  "data": { /* ... */ },
  "message": "İşlem başarılı",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
\`\`\`

### Hata Yanıtı
\`\`\`json
{
  "success": false,
  "message": "Hata mesajı",
  "errors": [
    {
      "field": "email",
      "message": "Geçerli bir email adresi giriniz"
    }
  ]
}
\`\`\`

## 🚦 HTTP Durum Kodları

| Kod | Açıklama |
|-----|----------|
| 200 | OK - İstek başarılı |
| 201 | Created - Kaynak oluşturuldu |
| 400 | Bad Request - Geçersiz istek |
| 401 | Unauthorized - Kimlik doğrulama gerekli |
| 403 | Forbidden - Yetki yok |
| 404 | Not Found - Kaynak bulunamadı |
| 422 | Unprocessable Entity - Validation hatası |
| 500 | Internal Server Error - Sunucu hatası |

---

## 📚 API Endpoints

`;

  // Kategorilere göre endpoint'leri listele
  for (const [category, categoryRoutes] of Object.entries(categorized)) {
    md += `\n## ${category}\n\n`;

    for (const route of categoryRoutes) {
      const yamlDoc = yamlDocs[route.name];
      const apiPrefix = getApiPrefix(route.name);

      md += `### ${formatRouteName(route.name)}\n\n`;

      if (yamlDoc?.info?.description) {
        md += `${yamlDoc.info.description}\n\n`;
      }

      md += `**Base Path:** \`${apiPrefix}\`\n\n`;

      // Endpoint'leri listele
      for (const endpoint of route.endpoints) {
        const badge = getMethodBadge(endpoint.method);
        md += `#### ${badge} \`${endpoint.path}\`\n\n`;

        // YAML'dan endpoint açıklaması bul
        const endpointDoc = findEndpointInYaml(yamlDoc, endpoint.method, endpoint.path);
        if (endpointDoc?.summary) {
          md += `**Açıklama:** ${endpointDoc.summary}\n\n`;
        }

        if (endpointDoc?.tags) {
          md += `**Tags:** ${endpointDoc.tags.map(t => `\`${t}\``).join(', ')}\n\n`;
        }
      }

      md += `---\n\n`;
    }
  }

  // Kategorize edilmemiş route'lar
  if (uncategorized.length > 0) {
    md += `\n## 🔹 Diğer Endpoints\n\n`;

    for (const route of uncategorized) {
      md += `### ${formatRouteName(route.name)}\n\n`;
      md += `**Base Path:** \`${getApiPrefix(route.name)}\`\n\n`;

      for (const endpoint of route.endpoints) {
        const badge = getMethodBadge(endpoint.method);
        md += `- ${badge} \`${endpoint.path}\`\n`;
      }

      md += `\n`;
    }
  }

  // İstatistikler
  md += `\n---\n\n## 📊 İstatistikler\n\n`;
  md += `- **Toplam Route Dosyası:** ${routes.length}\n`;
  md += `- **Toplam Endpoint:** ${routes.reduce((sum, r) => sum + r.endpoints.length, 0)}\n`;
  md += `- **Dokümante Edilmiş YAML Dosyası:** ${Object.keys(yamlDocs).length}\n`;
  md += `- **Kategori Sayısı:** ${Object.keys(categorized).length}\n\n`;

  md += `## 📖 Detaylı Dokümantasyon\n\n`;
  md += `Swagger UI dokümantasyonu için: [http://localhost:3333/api-docs](http://localhost:3333/api-docs)\n\n`;
  md += `---\n\n`;
  md += `> 💡 **Not:** Bu dokümantasyon otomatik olarak \`node scripts/generateApiDocs.js\` komutu ile oluşturulmuştur.\n`;

  return md;
}

// Yardımcı fonksiyonlar
function getApiPrefix(routeName) {
  const prefixMap = {
    auth: '/api/auth',
    dealers: '/api/dealers',
    companies: '/api/companies',
    departments: '/api/departments',
    employees: '/api/employees',
    users: '/api/users',
    roles: '/api/roles',
    permissions: '/api/permissions',
    settings: '/api/settings',
    globalSettings: '/api/global-settings',
    leaveRequests: '/api/leave-requests',
    leaveTypes: '/api/leave-types',
    attendances: '/api/attendances',
    dashboard: '/api/dashboard',
  };

  return prefixMap[routeName] || `/api/${routeName.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}

function formatRouteName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function getMethodBadge(method) {
  const badges = {
    GET: '🔵 GET',
    POST: '🟢 POST',
    PUT: '🟡 PUT',
    DELETE: '🔴 DELETE',
    PATCH: '🟠 PATCH',
  };
  return badges[method] || method;
}

function findEndpointInYaml(yamlDoc, method, path) {
  if (!yamlDoc?.paths) return null;

  const normalizedPath = path.replace(/^\//, '');

  for (const [yamlPath, pathData] of Object.entries(yamlDoc.paths)) {
    const normalizedYamlPath = yamlPath.replace(/^\//, '');

    if (normalizedYamlPath === normalizedPath && pathData[method.toLowerCase()]) {
      return pathData[method.toLowerCase()];
    }
  }

  return null;
}

// Ana fonksiyon
function main() {
  console.log('🚀 API Dokümantasyonu oluşturuluyor...\n');

  console.log('📂 Route dosyaları analiz ediliyor...');
  const routes = analyzeRouteFiles();
  console.log(`✅ ${routes.length} route dosyası bulundu\n`);

  console.log('📄 YAML dokümantasyonları yükleniyor...');
  const yamlDocs = loadYamlDocs();
  console.log(`✅ ${Object.keys(yamlDocs).length} YAML dosyası yüklendi\n`);

  console.log('📝 Markdown dokümantasyonu oluşturuluyor...');
  const markdown = generateMarkdown(routes, yamlDocs);

  console.log('💾 Dosya kaydediliyor...');
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
  console.log(`✅ Dokümantasyon oluşturuldu: ${OUTPUT_FILE}\n`);

  console.log('📊 Özet:');
  console.log(`   - Toplam endpoint: ${routes.reduce((sum, r) => sum + r.endpoints.length, 0)}`);
  console.log(`   - Route dosyası: ${routes.length}`);
  console.log(`   - YAML dosyası: ${Object.keys(yamlDocs).length}`);
  console.log('\n✨ Tamamlandı!');
}

// Script'i çalıştır
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { analyzeRouteFiles, loadYamlDocs, generateMarkdown };
