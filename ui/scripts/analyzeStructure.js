/**
 * Frontend Structure Analyzer
 *
 * Frontend proje yapısını analiz eder ve raporlar.
 * - Bağımlılık analizi
 * - Dosya boyutu kontrolü
 * - İsimlendirme kontrolü
 * - Kullanılmayan import'lar
 *
 * Kullanım: node scripts/analyzeStructure.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const THRESHOLDS = {
  maxFileSize: 500, // Maksimum satır sayısı
  maxComponentSize: 300,
  minComponentSize: 10,
};

// Tüm dosyaları tara
function findAllFiles(dir, ext, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        findAllFiles(filePath, ext, fileList);
      }
    } else if (ext.some(e => file.endsWith(e))) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Dosya boyutunu kontrol et
function checkFileSize(files) {
  const issues = [];
  const stats = {
    total: files.length,
    large: 0,
    small: 0,
    average: 0,
  };

  let totalLines = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    totalLines += lines;

    const relativePath = path.relative(SRC_DIR, file);

    if (lines > THRESHOLDS.maxFileSize) {
      stats.large++;
      issues.push({
        type: 'large-file',
        file: relativePath,
        lines,
        message: `Dosya çok büyük (${lines} satır). ${THRESHOLDS.maxFileSize} satırın altında olmalı.`,
      });
    }

    if (lines < THRESHOLDS.minComponentSize && file.endsWith('.vue')) {
      stats.small++;
      issues.push({
        type: 'small-file',
        file: relativePath,
        lines,
        message: `Component çok küçük (${lines} satır). Belki başka bir component ile birleştirilmeli?`,
      });
    }
  }

  stats.average = Math.round(totalLines / files.length);

  return { issues, stats };
}

// İsimlendirme kontrolü
function checkNaming(files) {
  const issues = [];

  for (const file of files) {
    const fileName = path.basename(file);
    const relativePath = path.relative(SRC_DIR, file);

    // Vue component'ler PascalCase olmalı
    if (file.endsWith('.vue')) {
      if (fileName[0] !== fileName[0].toUpperCase()) {
        issues.push({
          type: 'naming-convention',
          file: relativePath,
          message: `Component ismi PascalCase olmalı: ${fileName}`,
        });
      }
    }

    // Store dosyaları camelCase olmalı
    if (file.includes('/stores/') && file.endsWith('.js')) {
      if (fileName[0] === fileName[0].toUpperCase()) {
        issues.push({
          type: 'naming-convention',
          file: relativePath,
          message: `Store ismi camelCase olmalı: ${fileName}`,
        });
      }
    }

    // Test dosyaları .test veya .spec uzantısı olmalı
    if (file.includes('/tests/') || file.includes('__tests__')) {
      if (!fileName.includes('.test.') && !fileName.includes('.spec.')) {
        issues.push({
          type: 'naming-convention',
          file: relativePath,
          message: `Test dosyası .test veya .spec uzantısı içermeli: ${fileName}`,
        });
      }
    }
  }

  return issues;
}

// Kullanılmayan import'ları bul
function checkUnusedImports(files) {
  const issues = [];

  for (const file of files) {
    if (!file.endsWith('.vue') && !file.endsWith('.js')) continue;

    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(SRC_DIR, file);

    // Import edilen değişkenleri bul
    const importMatches = content.matchAll(/import\s+{([^}]+)}\s+from/g);

    for (const match of importMatches) {
      const imports = match[1].split(',').map(i => i.trim());

      for (const importName of imports) {
        // Import edilen değişken kullanılıyor mu?
        const importRegex = new RegExp(`\\b${importName}\\b`, 'g');
        const matches = content.match(importRegex);

        // Import satırı hariç, başka yerde kullanılıyor mu?
        if (!matches || matches.length <= 1) {
          issues.push({
            type: 'unused-import',
            file: relativePath,
            import: importName,
            message: `Kullanılmayan import: ${importName}`,
          });
        }
      }
    }
  }

  return issues;
}

// Bağımlılık analizi
function analyzeDependencies(files) {
  const dependencies = new Map();
  const circularDeps = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(SRC_DIR, file);

    // Local import'ları bul
    const importMatches = content.matchAll(/import\s+.+\s+from\s+['"]([^'"]+)['"]/g);

    const fileDeps = [];
    for (const match of importMatches) {
      const importPath = match[1];

      // Sadece local import'lar
      if (importPath.startsWith('.') || importPath.startsWith('@/')) {
        fileDeps.push(importPath);
      }
    }

    dependencies.set(relativePath, fileDeps);
  }

  // En çok import edilen dosyalar
  const importCounts = new Map();

  for (const [file, deps] of dependencies.entries()) {
    for (const dep of deps) {
      const count = importCounts.get(dep) || 0;
      importCounts.set(dep, count + 1);
    }
  }

  const topImports = Array.from(importCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    totalDependencies: dependencies.size,
    topImports,
    circularDeps,
  };
}

// Proje istatistikleri
function getProjectStats() {
  const vueFiles = findAllFiles(SRC_DIR, ['.vue']);
  const jsFiles = findAllFiles(SRC_DIR, ['.js', '.ts']);
  const styleFiles = findAllFiles(SRC_DIR, ['.css', '.scss']);

  return {
    components: vueFiles.length,
    scripts: jsFiles.length,
    styles: styleFiles.length,
    total: vueFiles.length + jsFiles.length + styleFiles.length,
  };
}

// Rapor oluştur
function generateReport(fileSize, naming, deps, stats) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 FRONTEND YAPI ANALİZ RAPORU');
  console.log('='.repeat(80) + '\n');

  // Genel İstatistikler
  console.log('📈 GENEL İSTATİSTİKLER\n');
  console.log(`   Vue Components:  ${stats.components}`);
  console.log(`   JS/TS Dosyaları: ${stats.scripts}`);
  console.log(`   Style Dosyaları: ${stats.styles}`);
  console.log(`   Toplam Dosya:    ${stats.total}`);
  console.log('');

  // Dosya Boyutu
  console.log('📏 DOSYA BOYUTU ANALİZİ\n');
  console.log(`   Ortalama Satır:  ${fileSize.stats.average}`);
  console.log(`   Büyük Dosyalar:  ${fileSize.stats.large}`);
  console.log(`   Küçük Dosyalar:  ${fileSize.stats.small}`);
  console.log('');

  if (fileSize.issues.length > 0) {
    console.log('⚠️  BOYUT UYARILARI\n');

    const largeFiles = fileSize.issues.filter(i => i.type === 'large-file');
    if (largeFiles.length > 0) {
      console.log(`   ${largeFiles.length} büyük dosya bulundu:\n`);
      largeFiles.slice(0, 5).forEach(issue => {
        console.log(`   📄 ${issue.file} (${issue.lines} satır)`);
      });
      if (largeFiles.length > 5) {
        console.log(`   ... ve ${largeFiles.length - 5} tane daha\n`);
      }
      console.log('');
    }
  }

  // İsimlendirme
  if (naming.length > 0) {
    console.log('🏷️  İSİMLENDİRME UYARILARI\n');
    console.log(`   ${naming.length} isimlendirme sorunu bulundu:\n`);

    naming.slice(0, 5).forEach(issue => {
      console.log(`   ⚠️  ${issue.file}`);
      console.log(`       ${issue.message}`);
      console.log('');
    });

    if (naming.length > 5) {
      console.log(`   ... ve ${naming.length - 5} tane daha\n`);
    }
  }

  // Bağımlılık Analizi
  console.log('🔗 BAĞIMLILIK ANALİZİ\n');
  console.log(`   Toplam Bağımlılık: ${deps.totalDependencies}`);
  console.log('');

  if (deps.topImports.length > 0) {
    console.log('   En Çok Import Edilen Dosyalar:\n');
    deps.topImports.forEach(([file, count], index) => {
      console.log(`   ${index + 1}. ${file} (${count} kez)`);
    });
    console.log('');
  }

  // Özet
  console.log('='.repeat(80));

  const totalIssues = fileSize.issues.length + naming.length;

  if (totalIssues === 0) {
    console.log('✅ PROJE YAPISI TEMİZ - Sorun bulunamadı!');
  } else {
    console.log(`⚠️  TOPLAM ${totalIssues} SORUN TESPİT EDİLDİ`);
    console.log('\n💡 Öneriler:');
    if (fileSize.issues.length > 0) {
      console.log('   - Büyük dosyaları daha küçük parçalara bölün');
    }
    if (naming.length > 0) {
      console.log('   - İsimlendirme konvansiyonlarına uyun');
    }
  }

  console.log('='.repeat(80) + '\n');
}

// Ana fonksiyon
function main() {
  console.log('\n🔍 Frontend yapısı analiz ediliyor...\n');

  const vueFiles = findAllFiles(SRC_DIR, ['.vue']);
  const jsFiles = findAllFiles(SRC_DIR, ['.js', '.ts']);
  const allFiles = [...vueFiles, ...jsFiles];

  console.log(`✅ ${allFiles.length} dosya bulundu`);

  console.log('📏 Dosya boyutları kontrol ediliyor...');
  const fileSize = checkFileSize(allFiles);

  console.log('🏷️  İsimlendirme kontrol ediliyor...');
  const naming = checkNaming(allFiles);

  console.log('🔗 Bağımlılıklar analiz ediliyor...');
  const deps = analyzeDependencies(allFiles);

  const stats = getProjectStats();

  generateReport(fileSize, naming, deps, stats);
}

// Script'i çalıştır
try {
  main();
} catch (error) {
  console.error('❌ Hata:', error.message);
  console.error(error.stack);
  process.exit(1);
}
