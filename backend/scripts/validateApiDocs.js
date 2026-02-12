/**
 * API Documentation Validator
 *
 * Bu script, route dosyalarını ve YAML dokümantasyonlarını kontrol ederek
 * eksik veya tutarsız dokümantasyonları tespit eder.
 *
 * Kullanım: node scripts/validateApiDocs.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROUTES_DIR = path.join(__dirname, '../routes');
const DOCS_DIR = path.join(__dirname, '../docs');

// Route dosyalarını analiz et
function analyzeRouteFiles() {
  const routes = [];
  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(ROUTES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    const routeMatches = content.matchAll(
      /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/gi
    );

    const routeName = file.replace('.js', '');
    const endpoints = [];

    for (const match of routeMatches) {
      const method = match[1].toUpperCase();
      const pathName = match[2];
      endpoints.push({ method, path: pathName });
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

// YAML dosyalarını yükle
function loadYamlDocs() {
  const docs = {};

  if (!fs.existsSync(DOCS_DIR)) {
    return docs;
  }

  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.yaml'));

  for (const file of files) {
    try {
      const filePath = path.join(DOCS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const yamlData = yaml.load(content);

      const docName = file.replace('.yaml', '');
      docs[docName] = {
        file,
        data: yamlData,
        endpoints: extractEndpointsFromYaml(yamlData),
      };
    } catch (error) {
      console.error(`❌ YAML parse hatası (${file}):`, error.message);
    }
  }

  return docs;
}

// YAML'dan endpoint'leri çıkar
function extractEndpointsFromYaml(yamlData) {
  const endpoints = [];

  if (yamlData?.paths) {
    for (const [pathName, pathData] of Object.entries(yamlData.paths)) {
      for (const [method, methodData] of Object.entries(pathData)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          endpoints.push({
            method: method.toUpperCase(),
            path: pathName,
            summary: methodData.summary,
            tags: methodData.tags || [],
          });
        }
      }
    }
  }

  return endpoints;
}

// Route isimlerini normalize et
function normalizeRouteName(name) {
  // camelCase'i kebab-case'e çevir
  return name
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

// Validasyon yap
function validateDocumentation(routes, yamlDocs) {
  const issues = {
    missingYaml: [],
    extraYaml: [],
    undocumentedEndpoints: [],
    yamlErrors: [],
    warnings: [],
  };

  // 1. Eksik YAML dosyalarını bul
  for (const route of routes) {
    const normalizedName = normalizeRouteName(route.name);
    const hasYaml = Object.keys(yamlDocs).some(docName => {
      const normalizedDocName = normalizeRouteName(docName);
      return normalizedDocName === normalizedName || docName === route.name;
    });

    if (!hasYaml) {
      issues.missingYaml.push({
        routeName: route.name,
        file: route.file,
        endpointCount: route.endpoints.length,
        suggestedYamlName: `${normalizedName}.yaml`,
      });
    }
  }

  // 2. Fazladan YAML dosyalarını bul (route'u olmayan)
  for (const [docName, docData] of Object.entries(yamlDocs)) {
    const normalizedDocName = normalizeRouteName(docName);
    const hasRoute = routes.some(route => {
      const normalizedRouteName = normalizeRouteName(route.name);
      return normalizedRouteName === normalizedDocName || route.name === docName;
    });

    if (!hasRoute) {
      issues.extraYaml.push({
        yamlName: docName,
        file: docData.file,
        endpointCount: docData.endpoints.length,
      });
    }
  }

  // 3. YAML'daki endpoint'lerin eksik açıklamalarını kontrol et
  for (const [docName, docData] of Object.entries(yamlDocs)) {
    for (const endpoint of docData.endpoints) {
      if (!endpoint.summary || endpoint.summary.trim() === '') {
        issues.undocumentedEndpoints.push({
          yaml: docData.file,
          method: endpoint.method,
          path: endpoint.path,
          issue: 'Eksik summary',
        });
      }

      if (!endpoint.tags || endpoint.tags.length === 0) {
        issues.warnings.push({
          yaml: docData.file,
          method: endpoint.method,
          path: endpoint.path,
          issue: 'Eksik tags',
        });
      }
    }
  }

  return issues;
}

// Rapor oluştur
function generateReport(routes, yamlDocs, issues) {
  console.log('\n' + '='.repeat(80));
  console.log('📋 API DOKÜMANTASYON VALİDASYON RAPORU');
  console.log('='.repeat(80) + '\n');

  // Genel İstatistikler
  console.log('📊 GENEL İSTATİSTİKLER\n');
  console.log(`   Toplam Route Dosyası:        ${routes.length}`);
  console.log(`   Toplam YAML Dokümantasyonu:  ${Object.keys(yamlDocs).length}`);
  console.log(
    `   Toplam Endpoint (Route):     ${routes.reduce((sum, r) => sum + r.endpoints.length, 0)}`
  );
  console.log(
    `   Toplam Endpoint (YAML):      ${Object.values(yamlDocs).reduce((sum, d) => sum + d.endpoints.length, 0)}`
  );
  console.log('');

  // Sorunlar
  let hasIssues = false;

  if (issues.missingYaml.length > 0) {
    hasIssues = true;
    console.log('❌ EKSİK YAML DOSYALARI\n');
    console.log(`   ${issues.missingYaml.length} route için YAML dokümantasyonu bulunamadı:\n`);

    for (const item of issues.missingYaml) {
      console.log(`   📄 ${item.file}`);
      console.log(`      Önerilen YAML: ${item.suggestedYamlName}`);
      console.log(`      Endpoint Sayısı: ${item.endpointCount}`);
      console.log('');
    }
  }

  if (issues.extraYaml.length > 0) {
    hasIssues = true;
    console.log('⚠️  FAZLADAN YAML DOSYALARI\n');
    console.log(`   ${issues.extraYaml.length} YAML dosyası için route bulunamadı:\n`);

    for (const item of issues.extraYaml) {
      console.log(`   📄 ${item.file}`);
      console.log(`      YAML İsmi: ${item.yamlName}`);
      console.log(`      Endpoint Sayısı: ${item.endpointCount}`);
      console.log('');
    }
  }

  if (issues.undocumentedEndpoints.length > 0) {
    hasIssues = true;
    console.log('📝 EKSİK ENDPOINT AÇIKLAMALARI\n');
    console.log(`   ${issues.undocumentedEndpoints.length} endpoint için summary eksik:\n`);

    const groupedByYaml = {};
    for (const item of issues.undocumentedEndpoints) {
      if (!groupedByYaml[item.yaml]) {
        groupedByYaml[item.yaml] = [];
      }
      groupedByYaml[item.yaml].push(item);
    }

    for (const [yamlFile, endpoints] of Object.entries(groupedByYaml)) {
      console.log(`   📄 ${yamlFile}`);
      for (const endpoint of endpoints) {
        console.log(`      - ${endpoint.method} ${endpoint.path} → ${endpoint.issue}`);
      }
      console.log('');
    }
  }

  if (issues.warnings.length > 0) {
    console.log('⚠️  UYARILAR\n');
    console.log(`   ${issues.warnings.length} endpoint için tag eksik:\n`);

    const groupedByYaml = {};
    for (const item of issues.warnings) {
      if (!groupedByYaml[item.yaml]) {
        groupedByYaml[item.yaml] = [];
      }
      groupedByYaml[item.yaml].push(item);
    }

    for (const [yamlFile, endpoints] of Object.entries(groupedByYaml)) {
      console.log(`   📄 ${yamlFile} (${endpoints.length} uyarı)`);
    }
    console.log('');
  }

  // Sonuç
  console.log('='.repeat(80));

  if (!hasIssues && issues.warnings.length === 0) {
    console.log('✅ DOKÜMANTASYON TAM VE GÜNCEL!');
  } else if (!hasIssues) {
    console.log('✅ KRİTİK SORUN YOK - Sadece bazı uyarılar mevcut');
  } else {
    console.log('❌ DOKÜMANTASYONDA SORUNLAR TESPİT EDİLDİ');
    console.log('\n💡 Öneriler:');
    if (issues.missingYaml.length > 0) {
      console.log('   - Eksik YAML dosyalarını backend/docs/ klasörüne ekleyin');
    }
    if (issues.extraYaml.length > 0) {
      console.log('   - Kullanılmayan YAML dosyalarını kaldırın veya günceleyin');
    }
    if (issues.undocumentedEndpoints.length > 0) {
      console.log("   - Endpoint'lere summary açıklaması ekleyin");
    }
  }

  console.log('='.repeat(80) + '\n');

  return hasIssues;
}

// Ana fonksiyon
function main() {
  console.log('\n🔍 API Dokümantasyonu kontrol ediliyor...\n');

  const routes = analyzeRouteFiles();
  console.log(`✅ ${routes.length} route dosyası analiz edildi`);

  const yamlDocs = loadYamlDocs();
  console.log(`✅ ${Object.keys(yamlDocs).length} YAML dosyası yüklendi`);

  const issues = validateDocumentation(routes, yamlDocs);
  const hasIssues = generateReport(routes, yamlDocs, issues);

  // Exit code: sorun varsa 1, yoksa 0
  process.exit(hasIssues ? 1 : 0);
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

module.exports = { analyzeRouteFiles, loadYamlDocs, validateDocumentation };
