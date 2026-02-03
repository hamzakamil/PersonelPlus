const Employment = require('../models/Employment');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Workplace = require('../models/Workplace');
const CompanyHolidayCalendar = require('../models/CompanyHolidayCalendar');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// İnşaat ve Balıkçılık NACE kodları (örnek - gerçek kodlar kullanılmalı)
const CONSTRUCTION_NACE_CODES = ['41', '42', '43']; // İnşaat sektörü
const FISHING_NACE_CODES = ['03']; // Balıkçılık sektörü

/**
 * Şirketin istisna sektörde olup olmadığını kontrol eder
 */
async function isExceptionSector(companyId) {
  const company = await Company.findById(companyId);
  if (!company || !company.naceCode) {
    return false;
  }
  
  const nacePrefix = company.naceCode.substring(0, 2);
  return CONSTRUCTION_NACE_CODES.includes(nacePrefix) || 
         FISHING_NACE_CODES.includes(nacePrefix);
}

/**
 * Tarihin resmi tatil olup olmadığını kontrol eder (şirket bazlı)
 * DEVRE DIŞI: Tatil kontrolü şimdilik pasifleştirildi
 */
async function checkHoliday(date, companyId) {
  // Tatil kontrolü devre dışı - her zaman false döner
  return false;
  
  /* ORİJİNAL KOD - YORUMDA:
  const checkDate = new Date(date);
  const year = checkDate.getFullYear();
  
  // Pazar her zaman tatildir
  if (checkDate.getDay() === 0) {
    return true;
  }
  
  // Şirket tatil takviminden kontrol et
  const calendar = await CompanyHolidayCalendar.findOne({ companyId, year });
  if (!calendar || !calendar.holidays || calendar.holidays.length === 0) {
    return false;
  }
  
  // Tarihi sadece gün/ay/yıl olarak karşılaştır (saat bilgisi olmadan)
  const checkDateStr = checkDate.toISOString().split('T')[0];
  return calendar.holidays.some(holiday => {
    const holidayStr = new Date(holiday).toISOString().split('T')[0];
    return holidayStr === checkDateStr;
  });
  */
}

/**
 * Dün resmi tatil mi kontrol eder
 * DEVRE DIŞI: Tatil kontrolü şimdilik pasifleştirildi
 */
async function wasHolidayYesterday(date, companyId) {
  // Tatil kontrolü devre dışı - her zaman false döner
  return false;
  
  /* ORİJİNAL KOD - YORUMDA:
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return await checkHoliday(yesterday, companyId);
  */
}

/**
 * İşe giriş validasyonları (Yeni kurallar)
 */
async function validateHireDate(hireDate, companyId) {
  const warnings = [];
  const now = new Date();
  const hire = new Date(hireDate);

  // Tarihleri yerel saat dilimine göre karşılaştır (UTC sorunu çözümü)
  // Sadece yıl, ay, gün değerlerini al (saat bilgisini yoksay)
  const getLocalDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const nowDateStr = getLocalDateStr(now);
  const hireDateStr = getLocalDateStr(hire);

  // Yarın kontrolü
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = getLocalDateStr(tomorrow);

  const isToday = hireDateStr === nowDateStr;
  const isTomorrow = hireDateStr === tomorrowDateStr;
  const isPast = hireDateStr < nowDateStr;
  const isMonday = hire.getDay() === 1; // Pazartesi = 1

  // Pazar kontrolü (Pazar her zaman tatil)
  const isSunday = hire.getDay() === 0;

  // Tatil kontrolü - DEVRE DIŞI
  const isHoliday = false;
  const wasHolidayYesterday = false;

  // Debug log (geliştirme aşamasında)
  console.log('validateHireDate:', { nowDateStr, hireDateStr, isToday, isPast, isTomorrow });

  // Geriye dönük kontrol - girişTarihi < bugün ise uyarı ver
  if (isPast) {
    warnings.push('SGK CEZASI RİSKİ: Geriye Dönük Giriş');
    return warnings; // Geriye dönük girişte diğer kontrollere gerek yok
  }

  // Aynı gün giriş kuralları
  if (isToday) {
    // Pazartesi veya tatil sonrası gün → Acil Kod
    if (isMonday) {
      warnings.push('Acil Kodu: Tatil Sonrası İşlem');
    } else {
      // Normal iş günü → Ceza Riski
      warnings.push('SGK CEZASI RİSKİ: Aynı Güne Giriş');
    }

    // Bugün için 13:00 sonrası kontrolü
    const hour = now.getHours();
    if (hour >= 13) {
      warnings.push('Acil Kodu: 13:00 Sonrası İşlem');
    }
  }

  // Yarın için 13:00 kuralı
  if (isTomorrow) {
    const hour = now.getHours();
    if (hour >= 13) {
      warnings.push('Acil Kodu: 13:00 Sonrası İşlem');
    }
  }

  return warnings;
}

/**
 * İşten çıkış validasyonları
 * Tüm günler dahil (resmi tatil, hafta tatili) geriye dönük 10 gün kontrolü yapar
 * Bugün - 10 = son gün hesaplaması yapılır
 */
function validateTerminationDate(terminationDate) {
  const warnings = [];
  const now = new Date();
  const termination = new Date(terminationDate);
  
  // Tarihleri sadece gün/ay/yıl olarak karşılaştır (saat bilgisi olmadan)
  const nowDateStr = now.toISOString().split('T')[0];
  const terminationDateStr = termination.toISOString().split('T')[0];
  
  // Geriye dönük max 10 gün kontrolü (tüm günler dahil: hafta tatili, resmi tatil)
  // Math.floor kullanarak gün farkını hesapla (bütün günler sayılır)
  const diffDays = Math.floor((now - termination) / (1000 * 60 * 60 * 24));
  
  // 11. gün ve sonrası için uyarı (> 10)
  if (diffDays > 10) {
    warnings.push('CEZA UYARISI: 10 günlük geriye dönük limit aşıldı.');
  }
  
  // 10. gün kontrolü (bugün - 10 = son gün)
  if (diffDays === 10) {
    const hour = now.getHours();
    // Saat 13:00 - 17:00 arası
    if (hour >= 13 && hour < 17) {
      warnings.push('Çıkış İçin Son gün ! Saat 17:00\'ye kadar onaylanması gerekir');
    }
    // Saat 17:00 ve sonrası
    else if (hour >= 17) {
      warnings.push('SGK CEZASI UYARISI: 10 günlük geriye dönük limit son günü saat 17:00\'den sonra talep gönderilemez.');
    }
  }
  
  return warnings;
}

/**
 * İş sözleşmesi PDF oluşturur
 */
async function generateEmploymentContract(employment, employee, company, workplace) {
  const doc = new PDFDocument({ margin: 50 });
  const fileName = `contract_${employment._id}_${Date.now()}.pdf`;
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'employment', 'contracts');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const filePath = path.join(uploadsDir, fileName);
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  
  // PDF içeriği
  doc.fontSize(16).text('İŞ SÖZLEŞMESİ', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(12);
  doc.text(`Çalışan Adı: ${employee.firstName} ${employee.lastName}`);
  doc.text(`TC Kimlik No: ${employee.tcKimlik || 'Belirtilmemiş'}`);
  doc.text(`SGK Meslek Kodu: ${employment.sgkProfessionCode || 'Belirtilmemiş'}`);
  doc.text(`İşe Giriş Tarihi: ${new Date(employment.hireDate).toLocaleDateString('tr-TR')}`);
  doc.text(`Şirket: ${company.name}`);
  doc.text(`SGK İşyeri: ${workplace.name}`);
  doc.text(`Ücret: ${employment.salaryAmount} TL (${employment.salaryType === 'net' ? 'Net' : 'Brüt'})`);
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve(`/uploads/employment/contracts/${fileName}`);
    });
    stream.on('error', reject);
  });
}

/**
 * İstifa dilekçesi metni oluşturur
 */
function generateResignationText(employee, terminationDate) {
  const date = new Date(terminationDate).toLocaleDateString('tr-TR');
  return `
Sayın Yetkili,

${employee.firstName} ${employee.lastName} olarak, ${date} tarihinden itibaren işten ayrılmak istediğimi saygılarımla bildiririm.

Saygılarımla,
${employee.firstName} ${employee.lastName}
TC Kimlik No: ${employee.tcKimlik || 'Belirtilmemiş'}
  `.trim();
}

/**
 * Kıdem ve İhbar hesaplaması
 */
function calculateSeveranceAndNotice(hireDate, terminationDate, grossSalary) {
  const hire = new Date(hireDate);
  const termination = new Date(terminationDate);
  
  // Çalışma süresi (yıl)
  const yearsWorked = (termination - hire) / (1000 * 60 * 60 * 24 * 365.25);
  
  // Kıdem tazminatı: (Yıl) * (30 günlük brüt maaş)
  const severancePay = Math.floor(yearsWorked) * (grossSalary * 30);
  
  // İhbar süresi (hafta)
  let noticeWeeks = 0;
  if (yearsWorked < 0.5) {
    noticeWeeks = 2; // <6 ay → 2 hafta
  } else if (yearsWorked < 1) {
    noticeWeeks = 4; // 6-1 yıl → 4 hafta
  } else if (yearsWorked < 3) {
    noticeWeeks = 6; // 1-3 yıl → 6 hafta
  } else {
    noticeWeeks = 8; // >3 yıl → 8 hafta
  }
  
  // İhbar tazminatı: (Hafta) * (Haftalık brüt maaş)
  const noticePay = noticeWeeks * (grossSalary / 30 * 7);
  
  return {
    yearsWorked: yearsWorked.toFixed(2),
    severancePay,
    noticeWeeks,
    noticePay,
    total: severancePay + noticePay
  };
}

/**
 * Kıdem ve İhbar hesap PDF'i oluşturur
 */
async function generateSeveranceNoticePDF(employment, employee, company, calculation) {
  const doc = new PDFDocument({ margin: 50 });
  const fileName = `severance_notice_${employment._id}_${Date.now()}.pdf`;
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'employment', 'severance');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const filePath = path.join(uploadsDir, fileName);
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);
  
  // PDF içeriği
  doc.fontSize(16).text('KIDEM VE İHBAR TAZMİNATI HESAP TABLOSU', { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(12);
  doc.text(`Çalışan: ${employee.firstName} ${employee.lastName}`);
  doc.text(`TC Kimlik No: ${employee.tcKimlik || 'Belirtilmemiş'}`);
  doc.text(`Şirket: ${company.name}`);
  doc.text(`İşe Giriş: ${new Date(employment.hireDate).toLocaleDateString('tr-TR')}`);
  doc.text(`İşten Çıkış: ${new Date(employment.terminationDate).toLocaleDateString('tr-TR')}`);
  doc.moveDown();
  
  doc.text(`Çalışma Süresi: ${calculation.yearsWorked} yıl`);
  doc.text(`Brüt Maaş: ${employment.salaryAmount} TL`);
  doc.moveDown();
  
  doc.fontSize(14).text('HESAPLAMALAR:', { underline: true });
  doc.fontSize(12);
  doc.text(`Kıdem Tazminatı: ${calculation.severancePay.toLocaleString('tr-TR')} TL`);
  doc.text(`İhbar Süresi: ${calculation.noticeWeeks} hafta`);
  doc.text(`İhbar Tazminatı: ${calculation.noticePay.toLocaleString('tr-TR')} TL`);
  doc.moveDown();
  doc.fontSize(14).text(`TOPLAM: ${calculation.total.toLocaleString('tr-TR')} TL`, { underline: true });
  
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve(`/uploads/employment/severance/${fileName}`);
    });
    stream.on('error', reject);
  });
}

module.exports = {
  isExceptionSector,
  validateHireDate,
  validateTerminationDate,
  generateEmploymentContract,
  generateResignationText,
  calculateSeveranceAndNotice,
  generateSeveranceNoticePDF
};

