/**
 * Frontend Component Documentation Generator
 *
 * Vue bileşenlerini, store'ları ve route'ları analiz ederek
 * Markdown formatında dokümantasyon oluşturur.
 *
 * Kullanım: node scripts/generateComponentDocs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const OUTPUT_FILE = path.join(__dirname, '../COMPONENT_DOCUMENTATION.md');

// Vue dosyalarını tara
function findVueFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        findVueFiles(filePath, fileList);
      }
    } else if (file.endsWith('.vue')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// JS/TS dosyalarını tara (stores, utils, services)
function findJSFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        findJSFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Component bilgilerini çıkar
function analyzeVueComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  const relativePath = path.relative(SRC_DIR, filePath);

  // Basit regex ile analiz (daha gelişmiş parser kullanılabilir)
  const info = {
    name: fileName.replace('.vue', ''),
    path: relativePath,
    hasTemplate: content.includes('<template>'),
    hasScript: content.includes('<script'),
    hasStyle: content.includes('<style'),
    isCompositionAPI: content.includes('setup>') || content.includes('setup('),
    props: extractProps(content),
    emits: extractEmits(content),
    imports: extractImports(content),
    comments: extractComments(content),
    lineCount: content.split('\n').length,
  };

  return info;
}

// Props'ları çıkar
function extractProps(content) {
  const props = [];

  // defineProps için
  const definePropsMatch = content.match(/defineProps\s*\(\s*{([^}]+)}/s);
  if (definePropsMatch) {
    const propsContent = definePropsMatch[1];
    const propMatches = propsContent.matchAll(/(\w+)\s*:\s*{([^}]+)}/g);

    for (const match of propMatches) {
      const propName = match[1];
      const propConfig = match[2];
      const typeMatch = propConfig.match(/type:\s*(\w+)/);
      const requiredMatch = propConfig.match(/required:\s*(true|false)/);
      const defaultMatch = propConfig.match(/default:\s*(.+?)(?:,|\})/);

      props.push({
        name: propName,
        type: typeMatch ? typeMatch[1] : 'unknown',
        required: requiredMatch ? requiredMatch[1] === 'true' : false,
        default: defaultMatch ? defaultMatch[1].trim() : undefined,
      });
    }
  }

  return props;
}

// Emits'leri çıkar
function extractEmits(content) {
  const emits = [];

  const defineEmitsMatch = content.match(/defineEmits\s*\(\s*\[([^\]]+)\]/);
  if (defineEmitsMatch) {
    const emitsContent = defineEmitsMatch[1];
    const emitMatches = emitsContent.matchAll(/['"]([^'"]+)['"]/g);

    for (const match of emitMatches) {
      emits.push(match[1]);
    }
  }

  // emit('eventName') şeklinde kullanımları da bul
  const emitCalls = content.matchAll(/emit\s*\(\s*['"]([^'"]+)['"]/g);
  for (const match of emitCalls) {
    if (!emits.includes(match[1])) {
      emits.push(match[1]);
    }
  }

  return emits;
}

// Import'ları çıkar
function extractImports(content) {
  const imports = [];
  const importMatches = content.matchAll(/import\s+(?:{[^}]+}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/g);

  for (const match of importMatches) {
    const importPath = match[1];
    if (!importPath.startsWith('node_modules') && !importPath.startsWith('vue')) {
      imports.push(importPath);
    }
  }

  return imports;
}

// Yorumları çıkar
function extractComments(content) {
  const comments = [];

  // Dosya başındaki yorum bloğunu al
  const headerCommentMatch = content.match(/^\/\*\*\s*\n([\s\S]*?)\*\//);
  if (headerCommentMatch) {
    comments.push(headerCommentMatch[1].trim());
  }

  return comments;
}

// Kategorilere göre grupla
function categorizeComponents(components) {
  const categories = {
    'Views (Sayfalar)': [],
    Layouts: [],
    'Components - UI Elements': [],
    'Components - Forms': [],
    'Components - Managers': [],
    'Components - Reports': [],
    'Components - Bordro': [],
    'Components - Modals': [],
    'Other Components': [],
  };

  for (const comp of components) {
    const path = comp.path.toLowerCase();

    if (path.startsWith('views/')) {
      categories['Views (Sayfalar)'].push(comp);
    } else if (path.startsWith('layouts/')) {
      categories['Layouts'].push(comp);
    } else if (path.includes('managers/')) {
      categories['Components - Managers'].push(comp);
    } else if (path.includes('reports/')) {
      categories['Components - Reports'].push(comp);
    } else if (path.includes('bordro/')) {
      categories['Components - Bordro'].push(comp);
    } else if (path.includes('modal')) {
      categories['Components - Modals'].push(comp);
    } else if (comp.name.match(/^(Button|Input|Select|Textarea|PhoneInput)/i)) {
      categories['Components - Forms'].push(comp);
    } else if (path.startsWith('components/')) {
      categories['Components - UI Elements'].push(comp);
    } else {
      categories['Other Components'].push(comp);
    }
  }

  return categories;
}

// Store analizi
function analyzeStores() {
  const storesDir = path.join(SRC_DIR, 'stores');
  if (!fs.existsSync(storesDir)) return [];

  const stores = [];
  const files = fs.readdirSync(storesDir);

  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.ts')) {
      const filePath = path.join(storesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');

      const storeNameMatch = content.match(/defineStore\s*\(\s*['"]([^'"]+)['"]/);
      const hasState = content.includes('state:') || content.includes('state()');
      const hasGetters = content.includes('getters:');
      const hasActions = content.includes('actions:');

      stores.push({
        name: storeNameMatch ? storeNameMatch[1] : file.replace(/\.(js|ts)$/, ''),
        file,
        hasState,
        hasGetters,
        hasActions,
      });
    }
  }

  return stores;
}

// Router analizi
function analyzeRouter() {
  const routerFile = path.join(SRC_DIR, 'router', 'index.js');
  if (!fs.existsSync(routerFile)) return { routes: [], meta: {} };

  const content = fs.readFileSync(routerFile, 'utf8');

  // Route sayısını tahmin et
  const routeMatches = content.match(/path:\s*['"]/g);
  const routeCount = routeMatches ? routeMatches.length : 0;

  // Guard'ları bul
  const hasBeforeEach = content.includes('beforeEach');
  const hasAfterEach = content.includes('afterEach');

  return {
    routeCount,
    hasBeforeEach,
    hasAfterEach,
  };
}

// Markdown oluştur
function generateMarkdown(components, stores, router) {
  const categories = categorizeComponents(components);

  let md = `# PersonelPlus Frontend - Component Documentation

> 📱 Vue 3 bileşenleri, store'lar ve routing yapısı dokümantasyonu

**Oluşturulma Tarihi:** ${new Date().toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })}

## 📊 Genel İstatistikler

| Metrik | Değer |
|--------|-------|
| Toplam Component | ${components.length} |
| Composition API | ${components.filter(c => c.isCompositionAPI).length} |
| Store Sayısı | ${stores.length} |
| Route Sayısı | ${router.routeCount} |
| Toplam Satır | ${components.reduce((sum, c) => sum + c.lineCount, 0).toLocaleString()} |

## 📋 İçindekiler

- [Views (Sayfalar)](#views-sayfalar)
- [Layouts](#layouts)
- [Components](#components)
- [Stores](#stores)
- [Router](#router)

---

`;

  // Component kategorileri
  for (const [category, comps] of Object.entries(categories)) {
    if (comps.length === 0) continue;

    md += `## ${category}\n\n`;
    md += `**Toplam:** ${comps.length} bileşen\n\n`;

    for (const comp of comps) {
      md += `### ${comp.name}\n\n`;
      md += `**Dosya:** \`${comp.path}\`\n\n`;

      if (comp.comments.length > 0) {
        md += `**Açıklama:**\n\n${comp.comments[0]}\n\n`;
      }

      md += `**Özellikler:**\n`;
      md += `- API: ${comp.isCompositionAPI ? 'Composition API' : 'Options API'}\n`;
      md += `- Template: ${comp.hasTemplate ? '✅' : '❌'}\n`;
      md += `- Script: ${comp.hasScript ? '✅' : '❌'}\n`;
      md += `- Style: ${comp.hasStyle ? '✅' : '❌'}\n`;
      md += `- Satır Sayısı: ${comp.lineCount}\n\n`;

      if (comp.props.length > 0) {
        md += `**Props:**\n\n`;
        md += `| Prop | Type | Required | Default |\n`;
        md += `|------|------|----------|----------|\n`;
        for (const prop of comp.props) {
          md += `| \`${prop.name}\` | \`${prop.type}\` | ${prop.required ? '✅' : '❌'} | ${prop.default || '-'} |\n`;
        }
        md += `\n`;
      }

      if (comp.emits.length > 0) {
        md += `**Events:**\n\n`;
        for (const emit of comp.emits) {
          md += `- \`${emit}\`\n`;
        }
        md += `\n`;
      }

      md += `---\n\n`;
    }
  }

  // Stores
  md += `## Stores (Pinia)\n\n`;
  md += `Toplam ${stores.length} store bulunmaktadır.\n\n`;

  if (stores.length > 0) {
    md += `| Store | State | Getters | Actions |\n`;
    md += `|-------|-------|---------|----------|\n`;

    for (const store of stores) {
      md += `| \`${store.name}\` | ${store.hasState ? '✅' : '❌'} | ${store.hasGetters ? '✅' : '❌'} | ${store.hasActions ? '✅' : '❌'} |\n`;
    }
    md += `\n`;
  }

  // Router
  md += `## Router\n\n`;
  md += `**Toplam Route:** ${router.routeCount}\n\n`;
  md += `**Navigation Guards:**\n`;
  md += `- beforeEach: ${router.hasBeforeEach ? '✅' : '❌'}\n`;
  md += `- afterEach: ${router.hasAfterEach ? '✅' : '❌'}\n\n`;

  md += `---\n\n`;
  md += `## 🔗 İlgili Dokümantasyon\n\n`;
  md += `- [Backend API Documentation](../backend/API_DOCUMENTATION.md)\n`;
  md += `- [RBAC Implementation](../RBAC_IMPLEMENTATION.md)\n`;
  md += `- [Main README](../README.md)\n\n`;

  md += `---\n\n`;
  md += `> 💡 **Not:** Bu dokümantasyon otomatik olarak \`node scripts/generateComponentDocs.js\` komutu ile oluşturulmuştur.\n`;

  return md;
}

// Ana fonksiyon
function main() {
  console.log('🚀 Frontend dokümantasyonu oluşturuluyor...\n');

  console.log('📂 Vue bileşenleri taranıyor...');
  const vueFiles = findVueFiles(SRC_DIR);
  console.log(`✅ ${vueFiles.length} Vue dosyası bulundu\n`);

  console.log('🔍 Bileşenler analiz ediliyor...');
  const components = vueFiles.map(analyzeVueComponent);
  console.log(`✅ ${components.length} bileşen analiz edildi\n`);

  console.log("📦 Store'lar analiz ediliyor...");
  const stores = analyzeStores();
  console.log(`✅ ${stores.length} store bulundu\n`);

  console.log('🛣️  Router analiz ediliyor...');
  const router = analyzeRouter();
  console.log(`✅ ${router.routeCount} route bulundu\n`);

  console.log('📝 Markdown dokümantasyonu oluşturuluyor...');
  const markdown = generateMarkdown(components, stores, router);

  console.log('💾 Dosya kaydediliyor...');
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
  console.log(`✅ Dokümantasyon oluşturuldu: ${OUTPUT_FILE}\n`);

  console.log('📊 Özet:');
  console.log(`   - Toplam component: ${components.length}`);
  console.log(`   - Toplam store: ${stores.length}`);
  console.log(`   - Toplam route: ${router.routeCount}`);
  console.log(`   - Composition API: ${components.filter(c => c.isCompositionAPI).length}`);
  console.log('\n✨ Tamamlandı!');
}

// Script'i çalıştır
try {
  main();
} catch (error) {
  console.error('❌ Hata:', error.message);
  console.error(error.stack);
  process.exit(1);
}
