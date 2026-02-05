/**
 * Rol ve Yetki Kontrol Deseni Tarayıcısı
 *
 * Bu script, backend route dosyalarında potansiyel
 * yetkilendirme hatalarını tespit eder.
 *
 * Kullanım: node scripts/checkRolePatterns.js
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');

// Kontrol edilecek problemli desenler
const PROBLEM_PATTERNS = [
  {
    name: 'Doğrudan role karşılaştırması (obje yerine string)',
    // role === 'string' deseni - eğer aynı fonksiyon içinde roleName tanımlanmamışsa
    pattern:
      /\brole\s*(?:===|!==|==|!=)\s*['"`](super_admin|bayi_admin|company_admin|employee|hr_manager|department_manager)['"`]/g,
    suggestion: 'const roleName = role?.name || role; kullanın ve roleName ile karşılaştırın',
    // Bu desen sadece roleName tanımlanmadan kullanıldığında hata
    contextCheck: (content, matchIndex) => {
      // Fonksiyon başlangıcını bul
      const before = content.substring(Math.max(0, matchIndex - 500), matchIndex);
      // roleName tanımı var mı kontrol et
      return !before.includes('const roleName') && !before.includes('let roleName');
    },
  },
];

// Uyarı seviyesinde kontroller
const WARNING_PATTERNS_INTERNAL = [
  {
    name: 'Company ID karşılaştırma potansiyel hata',
    pattern: /req\.user\.company\.toString\(\)/g,
    suggestion:
      'Eğer company obje olarak gelebiliyorsa: req.user.company?._id?.toString() || req.user.company?.toString()',
  },
  {
    name: 'Dealer ID karşılaştırma potansiyel hata',
    pattern: /req\.user\.dealer\.toString\(\)/g,
    suggestion:
      'Eğer dealer obje olarak gelebiliyorsa: req.user.dealer?._id?.toString() || req.user.dealer?.toString()',
  },
];

// Uyarı kontrolleri (önemsiz ama dikkat edilebilir)
const WARNING_PATTERNS = [
  {
    name: 'Optional chaining eksik olabilir',
    pattern: /req\.user\.(?:company|dealer|employee)\._id\.toString\(\)/g,
    suggestion: 'Optional chaining (?.) kullanmayı düşünün: req.user.company?._id?.toString()',
  },
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(path.join(__dirname, '..', '..'), filePath);
  const issues = [];

  // Problem desenleri kontrol et
  PROBLEM_PATTERNS.forEach(({ name, pattern, suggestion, contextCheck }) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Eğer contextCheck fonksiyonu varsa ve false dönerse, atla
      if (contextCheck && !contextCheck(content, match.index)) {
        continue;
      }
      const lineNumber = content.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'ERROR',
        file: relativePath,
        line: lineNumber,
        issue: name,
        match: match[0].substring(0, 80) + (match[0].length > 80 ? '...' : ''),
        suggestion,
      });
    }
  });

  // Dahili uyarı desenleri kontrol et
  WARNING_PATTERNS_INTERNAL.forEach(({ name, pattern, suggestion }) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'INFO',
        file: relativePath,
        line: lineNumber,
        issue: name,
        match: match[0].substring(0, 80) + (match[0].length > 80 ? '...' : ''),
        suggestion,
      });
    }
  });

  // Uyarı desenleri kontrol et
  WARNING_PATTERNS.forEach(({ name, pattern, suggestion }) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      issues.push({
        type: 'WARNING',
        file: relativePath,
        line: lineNumber,
        issue: name,
        match: match[0].substring(0, 80) + (match[0].length > 80 ? '...' : ''),
        suggestion,
      });
    }
  });

  return issues;
}

function scanDirectory(dir) {
  const allIssues = [];

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      allIssues.push(...scanDirectory(filePath));
    } else if (file.endsWith('.js')) {
      const issues = scanFile(filePath);
      allIssues.push(...issues);
    }
  });

  return allIssues;
}

function main() {
  console.log('='.repeat(60));
  console.log('  Rol ve Yetki Kontrol Deseni Tarayıcısı');
  console.log('='.repeat(60));
  console.log(`\nTaranıyor: ${ROUTES_DIR}\n`);

  const issues = scanDirectory(ROUTES_DIR);

  const errors = issues.filter(i => i.type === 'ERROR');
  const warnings = issues.filter(i => i.type === 'WARNING');
  const infos = issues.filter(i => i.type === 'INFO');

  if (errors.length > 0) {
    console.log('\n' + '!'.repeat(60));
    console.log('  HATALAR (' + errors.length + ' adet) - Düzeltilmeli');
    console.log('!'.repeat(60));

    errors.forEach(issue => {
      console.log(`\n[ERROR] ${issue.file}:${issue.line}`);
      console.log(`  Sorun: ${issue.issue}`);
      console.log(`  Eşleşme: ${issue.match}`);
      console.log(`  Öneri: ${issue.suggestion}`);
    });
  } else {
    console.log('\n✓ Kritik hata bulunamadı.');
  }

  if (infos.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('  BİLGİ (' + infos.length + ' adet) - İncelenebilir');
    console.log('-'.repeat(60));

    // Sadece ilk 10 tanesini göster
    const showInfos = infos.slice(0, 10);
    showInfos.forEach(issue => {
      console.log(`\n[INFO] ${issue.file}:${issue.line}`);
      console.log(`  Sorun: ${issue.issue}`);
      console.log(`  Öneri: ${issue.suggestion}`);
    });
    if (infos.length > 10) {
      console.log(`\n... ve ${infos.length - 10} adet daha`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('  UYARILAR (' + warnings.length + ' adet)');
    console.log('-'.repeat(60));

    warnings.forEach(issue => {
      console.log(`\n[WARN] ${issue.file}:${issue.line}`);
      console.log(`  Sorun: ${issue.issue}`);
      console.log(`  Eşleşme: ${issue.match}`);
      console.log(`  Öneri: ${issue.suggestion}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  Sonuç: ${errors.length} hata, ${infos.length} bilgi, ${warnings.length} uyarı`);
  console.log('='.repeat(60));

  // Hata varsa exit code 1 ile çık
  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
