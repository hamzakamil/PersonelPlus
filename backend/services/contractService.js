/**
 * İş Sözleşmesi Word Belgesi Oluşturma Servisi
 * 4 farklı sözleşme tipi desteklenir:
 * - BELİRSİZ_SÜRELİ: Normal/Daimi çalışan
 * - BELİRLİ_SÜRELİ: Proje bazlı, süreli iş
 * - KISMİ_SÜRELİ: Part-time çalışan
 * - UZAKTAN_ÇALIŞMA: Uzaktan/Remote çalışan
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  convertInchesToTwip,
  ImageRun
} = require('docx');
const fs = require('fs');
const path = require('path');

// Logo boyutlandırma yardımcı fonksiyonu
const getLogoImageRun = (logoPath) => {
  try {
    // uploads/companies/ altındaki logo dosyasını oku
    const fullPath = path.join(__dirname, '..', logoPath);
    if (!fs.existsSync(fullPath)) {
      console.log('Logo dosyası bulunamadı:', fullPath);
      return null;
    }
    const imageBuffer = fs.readFileSync(fullPath);
    return new ImageRun({
      data: imageBuffer,
      transformation: {
        width: 120,
        height: 60
      }
    });
  } catch (error) {
    console.error('Logo yükleme hatası:', error);
    return null;
  }
};

// Türkçe tarih formatlama
const formatDate = (date) => {
  if (!date) return '_______________';
  const d = new Date(date);
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

// Rakamı yazıya çevirme (basit versiyon)
const numberToWords = (num) => {
  if (!num || num === 0) return 'Sıfır';

  const ones = ['', 'Bir', 'İki', 'Üç', 'Dört', 'Beş', 'Altı', 'Yedi', 'Sekiz', 'Dokuz'];
  const tens = ['', 'On', 'Yirmi', 'Otuz', 'Kırk', 'Elli', 'Altmış', 'Yetmiş', 'Seksen', 'Doksan'];
  const thousands = ['', 'Bin', 'Milyon', 'Milyar'];

  const n = Math.floor(num);
  if (n < 10) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return (Math.floor(n / 100) === 1 ? 'Yüz' : ones[Math.floor(n / 100)] + ' Yüz') +
                       (n % 100 ? ' ' + numberToWords(n % 100) : '');
  if (n < 1000000) return (Math.floor(n / 1000) === 1 ? 'Bin' : numberToWords(Math.floor(n / 1000)) + ' Bin') +
                          (n % 1000 ? ' ' + numberToWords(n % 1000) : '');
  return numberToWords(Math.floor(n / 1000000)) + ' Milyon' +
         (n % 1000000 ? ' ' + numberToWords(n % 1000000) : '');
};

// Para formatı
const formatMoney = (amount) => {
  if (!amount) return '_______________';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

// Sözleşme tipi adları
const CONTRACT_TYPE_NAMES = {
  'BELİRSİZ_SÜRELİ': 'BELİRSİZ SÜRELİ İŞ SÖZLEŞMESİ',
  'BELİRLİ_SÜRELİ': 'BELİRLİ SÜRELİ İŞ SÖZLEŞMESİ',
  'KISMİ_SÜRELİ': 'KISMİ SÜRELİ (PART-TİME) İŞ SÖZLEŞMESİ',
  'UZAKTAN_ÇALIŞMA': 'UZAKTAN ÇALIŞMA SÖZLEŞMESİ'
};

// Ortak paragraf stilleri
const createTitle = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 32 })],
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 }
});

const createSubtitle = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 24 })],
  alignment: AlignmentType.CENTER,
  spacing: { after: 400 }
});

const createHeading = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 24 })],
  spacing: { before: 300, after: 200 }
});

const createParagraph = (text, options = {}) => new Paragraph({
  children: [new TextRun({ text, size: 22, ...options })],
  spacing: { after: 120 },
  alignment: options.alignment || AlignmentType.JUSTIFIED
});

const createBoldParagraph = (label, value) => new Paragraph({
  children: [
    new TextRun({ text: label, bold: true, size: 22 }),
    new TextRun({ text: value, size: 22 })
  ],
  spacing: { after: 80 }
});

// Taraflar bölümü
const createPartiesSection = (preRecord, company, workplace) => {
  const paragraphs = [];

  paragraphs.push(createHeading('TARAFLAR'));

  // İşveren
  paragraphs.push(createParagraph('1. İŞVEREN', { bold: true }));
  paragraphs.push(createBoldParagraph('Unvanı: ', company?.name || '_______________'));
  paragraphs.push(createBoldParagraph('Adresi: ', company?.address || '_______________'));
  paragraphs.push(createBoldParagraph('Vergi Dairesi/No: ', `${company?.taxOffice || '___'} / ${company?.taxNumber || '_______________'}`));
  if (company?.mersisNo) {
    paragraphs.push(createBoldParagraph('MERSİS No: ', company.mersisNo));
  }
  paragraphs.push(createBoldParagraph('SGK İşyeri: ', workplace?.name || '_______________'));
  if (workplace?.sgkRegisterNumber) {
    paragraphs.push(createBoldParagraph('SGK Sicil No: ', workplace.sgkRegisterNumber));
  }
  paragraphs.push(createParagraph('(Bundan böyle "İŞVEREN" olarak anılacaktır.)', { italics: true }));

  paragraphs.push(new Paragraph({ spacing: { after: 200 } }));

  // İşçi
  paragraphs.push(createParagraph('2. İŞÇİ', { bold: true }));
  paragraphs.push(createBoldParagraph('Adı Soyadı: ', preRecord.candidateFullName || '_______________'));
  paragraphs.push(createBoldParagraph('T.C. Kimlik No: ', preRecord.tcKimlikNo || '_______________'));
  paragraphs.push(createBoldParagraph('Telefon: ', preRecord.phone || '_______________'));
  paragraphs.push(createBoldParagraph('E-posta: ', preRecord.email || '_______________'));
  paragraphs.push(createParagraph('(Bundan böyle "İŞÇİ" olarak anılacaktır.)', { italics: true }));

  return paragraphs;
};

// Ortak maddeler
const createCommonArticles = (preRecord, company, workplace, startArticle = 1) => {
  const paragraphs = [];
  let article = startArticle;

  // Madde: Konu ve Amaç
  paragraphs.push(createHeading(`MADDE ${article++}: KONU VE AMAÇ`));
  paragraphs.push(createParagraph(
    'Bu sözleşme, İşveren ile İşçi arasındaki iş ilişkisinin koşullarını ve tarafların karşılıklı hak ve yükümlülüklerini düzenlemek amacıyla 4857 sayılı İş Kanunu ve ilgili mevzuat hükümleri çerçevesinde hazırlanmıştır.'
  ));

  // Madde: İşe Başlama Tarihi
  paragraphs.push(createHeading(`MADDE ${article++}: İŞE BAŞLAMA TARİHİ`));
  paragraphs.push(createParagraph(
    `İşçi, ${formatDate(preRecord.hireDate)} tarihinde işe başlayacaktır.`
  ));

  // Madde: Görev Tanımı
  paragraphs.push(createHeading(`MADDE ${article++}: GÖREV TANIMI`));
  const jobDesc = preRecord.sgkMeslekKodu
    ? `İşçi, "${preRecord.sgkMeslekKodu}" SGK meslek kodu kapsamındaki görevleri yerine getirecektir.`
    : 'İşçi, İşveren tarafından belirlenen görevleri yerine getirecektir.';
  paragraphs.push(createParagraph(jobDesc));
  paragraphs.push(createParagraph(
    'İşveren, işin gerektirdiği durumlarda İşçi\'nin görev tanımını ve çalışma şeklini değiştirme hakkına sahiptir.'
  ));

  // Madde: Çalışma Yeri
  paragraphs.push(createHeading(`MADDE ${article++}: ÇALIŞMA YERİ`));
  paragraphs.push(createParagraph(
    `İşçi, ${workplace?.name || 'İşveren\'in belirlediği'} işyerinde çalışacaktır.`
  ));
  if (workplace?.address) {
    paragraphs.push(createParagraph(`Adres: ${workplace.address}`));
  }

  return { paragraphs, nextArticle: article };
};

// Ücret maddesi
const createSalaryArticle = (preRecord, company, articleNum) => {
  const paragraphs = [];
  const salaryType = company?.payrollCalculationType === 'NET' ? 'Net' : 'Brüt';
  const amount = preRecord.ucret;

  paragraphs.push(createHeading(`MADDE ${articleNum}: ÜCRET`));
  paragraphs.push(createParagraph(
    `İşçi'ye aylık ${salaryType.toLowerCase()} ${formatMoney(amount)} TL (${numberToWords(amount)} Türk Lirası) ücret ödenecektir.`
  ));
  paragraphs.push(createParagraph(
    'Ücret, her ayın son iş günü İşçi\'nin banka hesabına yatırılacaktır.'
  ));
  paragraphs.push(createParagraph(
    'Yasal kesintiler (SGK primi, gelir vergisi, damga vergisi vb.) ücret üzerinden yapılacaktır.'
  ));

  return paragraphs;
};

// İmza bölümü
const createSignatureSection = () => {
  const today = formatDate(new Date());

  return [
    new Paragraph({ spacing: { before: 600 } }),
    createParagraph(`Sözleşme Tarihi: ${today}`, { alignment: AlignmentType.CENTER }),
    new Paragraph({ spacing: { before: 400 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                createParagraph('İŞVEREN', { bold: true, alignment: AlignmentType.CENTER }),
                new Paragraph({ spacing: { after: 600 } }),
                createParagraph('_______________________', { alignment: AlignmentType.CENTER }),
                createParagraph('Ad Soyad / Kaşe / İmza', { alignment: AlignmentType.CENTER })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [
                createParagraph('İŞÇİ', { bold: true, alignment: AlignmentType.CENTER }),
                new Paragraph({ spacing: { after: 600 } }),
                createParagraph('_______________________', { alignment: AlignmentType.CENTER }),
                createParagraph('Ad Soyad / İmza', { alignment: AlignmentType.CENTER })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ]
    })
  ];
};

// Diğer ortak maddeler (izin, gizlilik, fesih vb.)
const createOtherArticles = (startArticle) => {
  const paragraphs = [];
  let article = startArticle;

  // İzin Hakları
  paragraphs.push(createHeading(`MADDE ${article++}: İZİN HAKLARI`));
  paragraphs.push(createParagraph(
    'İşçi, 4857 sayılı İş Kanunu\'nda belirtilen yıllık ücretli izin haklarından yararlanır. İzin süreleri kıdeme göre belirlenir:'
  ));
  paragraphs.push(createParagraph('• 1-5 yıl arası: 14 gün'));
  paragraphs.push(createParagraph('• 5-15 yıl arası: 20 gün'));
  paragraphs.push(createParagraph('• 15 yıl ve üzeri: 26 gün'));

  // Gizlilik
  paragraphs.push(createHeading(`MADDE ${article++}: GİZLİLİK`));
  paragraphs.push(createParagraph(
    'İşçi, iş ilişkisi süresince ve sona erdikten sonra İşveren\'e ait ticari sırları, müşteri bilgilerini ve gizli nitelikteki tüm bilgileri korumakla yükümlüdür.'
  ));

  // Fesih
  paragraphs.push(createHeading(`MADDE ${article++}: FESİH`));
  paragraphs.push(createParagraph(
    'Bu sözleşme, 4857 sayılı İş Kanunu\'nda belirtilen ihbar sürelerine uyularak taraflardan herhangi biri tarafından feshedilebilir. İhbar süreleri:'
  ));
  paragraphs.push(createParagraph('• 6 aya kadar çalışma: 2 hafta'));
  paragraphs.push(createParagraph('• 6 ay - 1.5 yıl arası: 4 hafta'));
  paragraphs.push(createParagraph('• 1.5 - 3 yıl arası: 6 hafta'));
  paragraphs.push(createParagraph('• 3 yıldan fazla: 8 hafta'));

  // Uygulanacak Hukuk
  paragraphs.push(createHeading(`MADDE ${article++}: UYGULANACAK HUKUK`));
  paragraphs.push(createParagraph(
    'Bu sözleşmede hüküm bulunmayan hallerde 4857 sayılı İş Kanunu, 6098 sayılı Türk Borçlar Kanunu ve ilgili mevzuat hükümleri uygulanır.'
  ));

  return { paragraphs, nextArticle: article };
};

// ========== SÖZLEŞME TİPLERİ ==========

// 1. Belirsiz Süreli İş Sözleşmesi
const generateIndefiniteContract = (preRecord, company, workplace) => {
  const sections = [];

  // Başlık
  sections.push(createTitle('İŞ SÖZLEŞMESİ'));
  sections.push(createSubtitle('(Belirsiz Süreli)'));

  // Taraflar
  sections.push(...createPartiesSection(preRecord, company, workplace));

  // Ortak maddeler
  const { paragraphs: commonParagraphs, nextArticle } = createCommonArticles(preRecord, company, workplace, 1);
  sections.push(...commonParagraphs);

  // Çalışma Saatleri
  sections.push(createHeading(`MADDE ${nextArticle}: ÇALIŞMA SAATLERİ`));
  sections.push(createParagraph(
    'İşçi, haftada 45 (kırkbeş) saat çalışacaktır. Günlük çalışma süresi en fazla 11 saat olup, haftalık çalışma saatleri haftanın çalışılan günlerine eşit olarak bölünecektir.'
  ));

  // Ücret
  sections.push(...createSalaryArticle(preRecord, company, nextArticle + 1));

  // Diğer maddeler
  const { paragraphs: otherParagraphs } = createOtherArticles(nextArticle + 2);
  sections.push(...otherParagraphs);

  // İmza
  sections.push(...createSignatureSection());

  return new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
};

// 2. Belirli Süreli İş Sözleşmesi
const generateFixedTermContract = (preRecord, company, workplace) => {
  const sections = [];

  // Başlık
  sections.push(createTitle('İŞ SÖZLEŞMESİ'));
  sections.push(createSubtitle('(Belirli Süreli)'));

  // Taraflar
  sections.push(...createPartiesSection(preRecord, company, workplace));

  // Ortak maddeler
  const { paragraphs: commonParagraphs, nextArticle } = createCommonArticles(preRecord, company, workplace, 1);
  sections.push(...commonParagraphs);

  // Sözleşme Süresi (Belirli Süreliye özel)
  sections.push(createHeading(`MADDE ${nextArticle}: SÖZLEŞME SÜRESİ`));
  sections.push(createParagraph(
    `Bu sözleşme ${formatDate(preRecord.hireDate)} tarihinde başlayacak olup, belirli bir süre için yapılmıştır.`
  ));
  sections.push(createParagraph(
    'Sözleşme süresi sonunda, tarafların mutabakatıyla yenilenebilir. Yenileme yapılmaması halinde sözleşme kendiliğinden sona erer.'
  ));
  sections.push(createParagraph(
    'NOT: Belirli süreli iş sözleşmesi, esaslı bir neden olmadıkça birden fazla üst üste yapılamaz. Aksi halde sözleşme başlangıçtan itibaren belirsiz süreli sayılır.', { italics: true }
  ));

  // Çalışma Saatleri
  sections.push(createHeading(`MADDE ${nextArticle + 1}: ÇALIŞMA SAATLERİ`));
  sections.push(createParagraph(
    'İşçi, haftada 45 (kırkbeş) saat çalışacaktır. Günlük çalışma süresi en fazla 11 saat olup, haftalık çalışma saatleri haftanın çalışılan günlerine eşit olarak bölünecektir.'
  ));

  // Ücret
  sections.push(...createSalaryArticle(preRecord, company, nextArticle + 2));

  // Diğer maddeler
  const { paragraphs: otherParagraphs } = createOtherArticles(nextArticle + 3);
  sections.push(...otherParagraphs);

  // İmza
  sections.push(...createSignatureSection());

  return new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
};

// 3. Kısmi Süreli (Part-Time) İş Sözleşmesi
const generatePartTimeContract = (preRecord, company, workplace) => {
  const sections = [];

  // Başlık
  sections.push(createTitle('İŞ SÖZLEŞMESİ'));
  sections.push(createSubtitle('(Kısmi Süreli / Part-Time)'));

  // Taraflar
  sections.push(...createPartiesSection(preRecord, company, workplace));

  // Ortak maddeler
  const { paragraphs: commonParagraphs, nextArticle } = createCommonArticles(preRecord, company, workplace, 1);
  sections.push(...commonParagraphs);

  // Çalışma Saatleri (Part-Time'a özel)
  sections.push(createHeading(`MADDE ${nextArticle}: ÇALIŞMA SAATLERİ`));
  sections.push(createParagraph(
    'İşçi, kısmi süreli (part-time) olarak çalışacaktır. Haftalık çalışma süresi 45 saatin altında olup, aşağıda belirtilmiştir:'
  ));

  // Part-time detaylarını preRecord'dan al
  const pt = preRecord.partTimeDetails || {};
  const weeklyHours = pt.weeklyHours ? `${pt.weeklyHours}` : '__________';
  const workDays = pt.workDays?.length > 0 ? pt.workDays.join(', ') : '__________';
  const dailyHours = pt.dailyHours ? `${pt.dailyHours}` : '__________';
  const paymentTypeText = pt.paymentType === 'hourly' ? 'Saatlik' : 'Aylık Sabit';

  sections.push(createParagraph(`Haftalık Çalışma Saati: ${weeklyHours} saat`));
  sections.push(createParagraph(`Çalışma Günleri: ${workDays}`));
  sections.push(createParagraph(`Günlük Çalışma Saati: ${dailyHours} saat`));
  sections.push(createParagraph(`Ücretlendirme Türü: ${paymentTypeText}`));
  sections.push(createParagraph(
    'NOT: Kısmi süreli çalışan işçinin ücreti ve diğer hakları, tam süreli emsal işçiye göre çalıştığı süreyle orantılı olarak hesaplanır.', { italics: true }
  ));

  // Ücret
  sections.push(...createSalaryArticle(preRecord, company, nextArticle + 1));
  sections.push(createParagraph(
    'Belirtilen ücret, kısmi süreli çalışma karşılığı olup, tam süreli çalışmaya orantılanmıştır.'
  ));

  // Diğer maddeler
  const { paragraphs: otherParagraphs } = createOtherArticles(nextArticle + 2);
  sections.push(...otherParagraphs);

  // İmza
  sections.push(...createSignatureSection());

  return new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
};

// 4. Uzaktan Çalışma Sözleşmesi
const generateRemoteWorkContract = (preRecord, company, workplace) => {
  const sections = [];

  // Başlık
  sections.push(createTitle('İŞ SÖZLEŞMESİ'));
  sections.push(createSubtitle('(Uzaktan Çalışma)'));

  // Taraflar
  sections.push(...createPartiesSection(preRecord, company, workplace));

  // Ortak maddeler (çalışma yeri hariç)
  let article = 1;

  // Konu ve Amaç
  sections.push(createHeading(`MADDE ${article++}: KONU VE AMAÇ`));
  sections.push(createParagraph(
    'Bu sözleşme, İşveren ile İşçi arasındaki uzaktan çalışma ilişkisinin koşullarını ve tarafların karşılıklı hak ve yükümlülüklerini düzenlemek amacıyla 4857 sayılı İş Kanunu\'nun 14. maddesi ve ilgili mevzuat hükümleri çerçevesinde hazırlanmıştır.'
  ));

  // İşe Başlama
  sections.push(createHeading(`MADDE ${article++}: İŞE BAŞLAMA TARİHİ`));
  sections.push(createParagraph(
    `İşçi, ${formatDate(preRecord.hireDate)} tarihinde işe başlayacaktır.`
  ));

  // Görev Tanımı
  sections.push(createHeading(`MADDE ${article++}: GÖREV TANIMI`));
  const jobDesc = preRecord.sgkMeslekKodu
    ? `İşçi, "${preRecord.sgkMeslekKodu}" SGK meslek kodu kapsamındaki görevleri uzaktan çalışma yöntemiyle yerine getirecektir.`
    : 'İşçi, İşveren tarafından belirlenen görevleri uzaktan çalışma yöntemiyle yerine getirecektir.';
  sections.push(createParagraph(jobDesc));

  // Uzaktan Çalışma Yeri (özel madde)
  sections.push(createHeading(`MADDE ${article++}: ÇALIŞMA YERİ VE UZAKTAN ÇALIŞMA KOŞULLARI`));
  sections.push(createParagraph(
    'İşçi, işini İşveren\'in işyeri dışında, kendi belirleyeceği bir mekanda (ev, ortak çalışma alanı vb.) uzaktan çalışma yöntemiyle yerine getirecektir.'
  ));
  sections.push(createParagraph(
    'İşçi, çalışma mekanının iş sağlığı ve güvenliği açısından uygun olmasını sağlamakla yükümlüdür.'
  ));

  // Çalışma Saatleri
  sections.push(createHeading(`MADDE ${article++}: ÇALIŞMA SAATLERİ`));
  sections.push(createParagraph(
    'İşçi, haftada 45 (kırkbeş) saat çalışacaktır. Çalışma saatleri esnek olup, İşveren\'in belirlediği çekirdek saatlerde ulaşılabilir olması gerekmektedir.'
  ));
  sections.push(createParagraph(
    'İşçi, günlük ve haftalık iş yükünü düzenli olarak tamamlamakla yükümlüdür.'
  ));

  // Ücret
  sections.push(...createSalaryArticle(preRecord, company, article++));

  // İş Ekipmanları (uzaktan çalışmaya özel)
  sections.push(createHeading(`MADDE ${article++}: İŞ EKİPMANLARI`));
  sections.push(createParagraph(
    'İşveren, uzaktan çalışma için gerekli ekipmanları (bilgisayar, yazılım lisansları vb.) sağlayacaktır. Bu ekipmanlar İşveren\'in mülkiyetinde kalır ve iş ilişkisi sona erdiğinde iade edilecektir.'
  ));
  sections.push(createParagraph(
    'İşçi\'nin kendi ekipmanlarını kullanması halinde, bakım ve güncelleme sorumluluğu İşçi\'ye aittir.'
  ));

  // İletişim (uzaktan çalışmaya özel)
  sections.push(createHeading(`MADDE ${article++}: İLETİŞİM GEREKSİNİMLERİ`));
  sections.push(createParagraph(
    'İşçi, çalışma saatleri içinde telefon, e-posta ve İşveren\'in belirlediği iletişim araçları üzerinden ulaşılabilir olacaktır.'
  ));
  sections.push(createParagraph(
    'Periyodik toplantılar (çevrimiçi veya yüz yüze) İşveren tarafından planlanabilir ve İşçi bu toplantılara katılmakla yükümlüdür.'
  ));

  // Veri Güvenliği (uzaktan çalışmaya özel)
  sections.push(createHeading(`MADDE ${article++}: VERİ GÜVENLİĞİ`));
  sections.push(createParagraph(
    'İşçi, İşveren\'e ait verilerin güvenliğini sağlamak için gerekli tüm önlemleri almakla yükümlüdür. Bu kapsamda:'
  ));
  sections.push(createParagraph('• Güvenli internet bağlantısı kullanılacaktır'));
  sections.push(createParagraph('• Şirket verilerine yetkisiz kişilerin erişimi engellenecektir'));
  sections.push(createParagraph('• İşveren\'in belirlediği güvenlik protokollerine uyulacaktır'));
  sections.push(createParagraph('• Gizli bilgiler üçüncü kişilerle paylaşılmayacaktır'));

  // Masraf Karşılama (uzaktan çalışmaya özel)
  sections.push(createHeading(`MADDE ${article++}: MASRAF KARŞILAMA`));
  sections.push(createParagraph(
    'Uzaktan çalışma nedeniyle oluşan giderler (internet, elektrik vb.) konusunda taraflar aşağıdaki şekilde mutabık kalmıştır:'
  ));
  sections.push(createParagraph('[ ] İşveren tarafından karşılanacaktır'));
  sections.push(createParagraph('[ ] İşçi tarafından karşılanacaktır'));
  sections.push(createParagraph('[ ] Taraflar arasında paylaşılacaktır'));

  // İzin hakları, gizlilik ve fesih
  const { paragraphs: otherParagraphs } = createOtherArticles(article);
  sections.push(...otherParagraphs);

  // İmza
  sections.push(...createSignatureSection());

  return new Document({
    sections: [{
      properties: {},
      children: sections
    }]
  });
};

// Şablon seçici
const CONTRACT_TEMPLATES = {
  'BELİRSİZ_SÜRELİ': generateIndefiniteContract,
  'BELİRLİ_SÜRELİ': generateFixedTermContract,
  'KISMİ_SÜRELİ': generatePartTimeContract,
  'UZAKTAN_ÇALIŞMA': generateRemoteWorkContract
};

/**
 * Ana sözleşme oluşturma fonksiyonu
 * @param {Object} preRecord - EmploymentPreRecord belgesi
 * @param {Object} company - Şirket bilgileri
 * @param {Object} workplace - İşyeri bilgileri
 * @returns {Promise<{fileName, filePath, fileUrl}>}
 */
async function generateContract(preRecord, company, workplace) {
  const contractType = preRecord.contractType || 'BELİRSİZ_SÜRELİ';
  const templateFn = CONTRACT_TEMPLATES[contractType];

  if (!templateFn) {
    throw new Error(`Bilinmeyen sözleşme tipi: ${contractType}`);
  }

  // Document oluştur
  const doc = templateFn(preRecord, company, workplace);

  // Dosya adı ve yolu
  const fileName = `sozlesme_${preRecord._id}_${Date.now()}.docx`;
  const uploadDir = path.join(__dirname, '../uploads/employment/contracts/word');
  const filePath = path.join(uploadDir, fileName);

  // Klasör yoksa oluştur
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Buffer oluştur ve kaydet
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);

  return {
    fileName,
    filePath,
    fileUrl: `/uploads/employment/contracts/word/${fileName}`
  };
}

/**
 * Sözleşme tipinin Türkçe adını döndürür
 */
function getContractTypeName(contractType) {
  return CONTRACT_TYPE_NAMES[contractType] || 'İŞ SÖZLEŞMESİ';
}

/**
 * İş Başvuru Formu Word Belgesi Oluşturur
 * İş Kanunu'na uygun, profesyonel başvuru formu
 */
async function generateJobApplicationForm(preRecord, company, workplace) {
  const candidateName = preRecord.candidateFullName || '_______________';
  const tcNo = preRecord.tcKimlikNo || '_______________';
  const phone = preRecord.phone || '_______________';
  const email = preRecord.email || '_______________';
  const position = preRecord.sgkMeslekKodu || '_______________';
  const companyName = company?.name || '_______________';
  const companyTitle = company?.title || companyName; // Şirket ünvanı
  const companyLogo = company?.logo || null;
  const todayDate = formatDate(new Date());

  // Logo varsa yükle
  let logoImageRun = null;
  if (companyLogo) {
    logoImageRun = getLogoImageRun(companyLogo);
  }

  // Tablo oluşturma yardımcı fonksiyonları
  const createFormRow = (label, value = '', width1 = 30, width2 = 70) => {
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 20 })],
            spacing: { before: 50, after: 50 }
          })],
          width: { size: width1, type: WidthType.PERCENTAGE },
          shading: { fill: 'F5F5F5' }
        }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: value, size: 20 })],
            spacing: { before: 50, after: 50 }
          })],
          width: { size: width2, type: WidthType.PERCENTAGE }
        })
      ]
    });
  };

  const createSectionHeader = (text) => {
    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text, bold: true, size: 22, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 80 }
          })],
          columnSpan: 2,
          shading: { fill: '2563EB' }
        })
      ]
    });
  };

  const createEmptyRow = (label) => createFormRow(label, '');

  // Eğitim satırları (3 adet)
  const educationRows = [];
  for (let i = 1; i <= 3; i++) {
    educationRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: `${i}. Eğitim`, bold: true, size: 20 })],
              spacing: { before: 50, after: 50 }
            })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: 'F5F5F5' },
            rowSpan: 4
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Okul/Üniversite:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Bölüm:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Mezuniyet Yılı:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Derece:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );
  }

  // İş deneyimi satırları (3 adet)
  const experienceRows = [];
  for (let i = 1; i <= 3; i++) {
    experienceRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: `${i}. İş Deneyimi`, bold: true, size: 20 })],
              spacing: { before: 50, after: 50 }
            })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: 'F5F5F5' },
            rowSpan: 5
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Firma Adı:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Pozisyon:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Çalışma Dönemi:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Ayrılma Nedeni:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Son Maaş (Net/Brüt):', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );
  }

  // Referans satırları (2 adet)
  const referenceRows = [];
  for (let i = 1; i <= 2; i++) {
    referenceRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: `${i}. Referans`, bold: true, size: 20 })],
              spacing: { before: 50, after: 50 }
            })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: 'F5F5F5' },
            rowSpan: 4
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Ad Soyad:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Firma/Ünvan:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Telefon:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'İlişki:', size: 18 })],
              spacing: { before: 30, after: 30 }
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ children: [], spacing: { before: 30, after: 30 } })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          })
        ]
      })
    );
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.6),
            bottom: convertInchesToTwip(0.6),
            left: convertInchesToTwip(0.7),
            right: convertInchesToTwip(0.7)
          }
        }
      },
      children: [
        // Logo (varsa)
        ...(logoImageRun ? [new Paragraph({
          children: [logoImageRun],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        })] : []),
        // Şirket Ünvanı
        new Paragraph({
          children: [new TextRun({ text: companyTitle, bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        // Form Başlığı
        new Paragraph({
          children: [new TextRun({ text: 'İŞ BAŞVURU FORMU', bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Tarih: ${todayDate}`, size: 18, italics: true })],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 200 }
        }),

        // 1. KİŞİSEL BİLGİLER
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createSectionHeader('1. KİŞİSEL BİLGİLER'),
            createFormRow('Ad Soyad', candidateName),
            createFormRow('T.C. Kimlik No', tcNo),
            createEmptyRow('Doğum Tarihi'),
            createEmptyRow('Doğum Yeri'),
            createFormRow('Cinsiyet', '☐ Erkek    ☐ Kadın'),
            createFormRow('Medeni Durum', '☐ Evli    ☐ Bekar    ☐ Boşanmış'),
            createEmptyRow('Uyruk'),
            createFormRow('Askerlik Durumu', '☐ Yapıldı    ☐ Muaf    ☐ Tecilli    ☐ Yapılmadı'),
            createEmptyRow('Ehliyet'),
            createFormRow('Engel Durumu', '☐ Yok    ☐ Var (Belirtiniz: ________________)'),
            createFormRow('Sabıka Kaydı', '☐ Yok    ☐ Var'),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 200 } }),

        // 2. İLETİŞİM BİLGİLERİ
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createSectionHeader('2. İLETİŞİM BİLGİLERİ'),
            createEmptyRow('İkametgah Adresi'),
            createEmptyRow('İl / İlçe'),
            createFormRow('Cep Telefonu', phone),
            createEmptyRow('Ev Telefonu'),
            createFormRow('E-posta', email),
            createEmptyRow('Acil Durumda Aranacak Kişi'),
            createEmptyRow('Yakınlık Derecesi / Telefon'),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 200 } }),

        // 3. EĞİTİM BİLGİLERİ
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createSectionHeader('3. EĞİTİM BİLGİLERİ'),
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'En Son Mezun Olunan Okul Türü', bold: true, size: 20 })],
                    spacing: { before: 50, after: 50 }
                  })],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: 'F5F5F5' }
                }),
                new TableCell({
                  children: [new Paragraph({
                    children: [new TextRun({ text: '☐ İlkokul  ☐ Ortaokul  ☐ Lise  ☐ Ön Lisans  ☐ Lisans  ☐ Yüksek Lisans  ☐ Doktora', size: 18 })],
                    spacing: { before: 50, after: 50 }
                  })],
                  width: { size: 70, type: WidthType.PERCENTAGE }
                })
              ]
            }),
            ...educationRows
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 200 } }),

        // 4. İŞ DENEYİMİ
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createSectionHeader('4. İŞ DENEYİMİ (Son 3 İş)'),
            ...experienceRows
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 200 } }),

        // 5. REFERANSLAR
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createSectionHeader('5. REFERANSLAR'),
            ...referenceRows
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 200 } }),

        // 6. BAŞVURU BİLGİLERİ
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createSectionHeader('6. BAŞVURU BİLGİLERİ'),
            createFormRow('Başvurulan Pozisyon', position),
            createEmptyRow('Beklenen Ücret (Net)'),
            createFormRow('İşe Başlama Tarihi', preRecord.hireDate ? formatDate(preRecord.hireDate) : ''),
            createFormRow('Çalışma Şekli Tercihi', '☐ Tam Zamanlı    ☐ Yarı Zamanlı    ☐ Uzaktan'),
            createFormRow('Vardiyalı Çalışabilir misiniz?', '☐ Evet    ☐ Hayır'),
            createFormRow('Seyahat Engeli Var mı?', '☐ Yok    ☐ Var'),
            createEmptyRow('Yabancı Dil (Dil/Seviye)'),
            createEmptyRow('Bilgisayar Becerileri'),
            createEmptyRow('Sertifikalar'),
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 200 } }),

        // 7. KVKK ve BEYAN
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createSectionHeader('7. KİŞİSEL VERİLERİN KORUNMASI (KVKK) AYDINLATMA VE ONAY'),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({
                        text: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, işbu iş başvuru formunda yer alan kişisel verilerimin; işe alım sürecinin yürütülmesi, değerlendirilmesi ve sonuçlandırılması amacıyla ' + companyName + ' tarafından işlenmesine, saklanmasına ve gerektiğinde yetkili kurum ve kuruluşlarla paylaşılmasına muvafakat ediyorum.',
                        size: 18
                      })],
                      spacing: { before: 100, after: 100 },
                      alignment: AlignmentType.JUSTIFIED
                    }),
                    new Paragraph({
                      children: [new TextRun({
                        text: 'Aydınlatma metnini okudum, anladım ve kabul ediyorum.',
                        size: 18,
                        bold: true
                      })],
                      spacing: { before: 100, after: 50 }
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: '☐ Kabul Ediyorum    ☐ Kabul Etmiyorum', size: 20 })],
                      spacing: { before: 50, after: 100 }
                    })
                  ],
                  columnSpan: 2
                })
              ]
            })
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 200 } }),

        // 8. BEYAN
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            createSectionHeader('8. BEYAN'),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({
                        text: 'Yukarıda vermiş olduğum tüm bilgilerin doğru ve eksiksiz olduğunu, aksi halde doğacak tüm hukuki sorumluluğun tarafıma ait olacağını, işe alınmam halinde yanlış veya eksik bilgi vermemden dolayı iş akdimin feshedilmesi dahil her türlü yaptırımı kabul ettiğimi beyan ederim.',
                        size: 18
                      })],
                      spacing: { before: 100, after: 100 },
                      alignment: AlignmentType.JUSTIFIED
                    }),
                    new Paragraph({
                      children: [new TextRun({
                        text: 'Bu formda belirtilen bilgilerin doğruluğunu onaylıyorum.',
                        size: 18,
                        bold: true
                      })],
                      spacing: { before: 100, after: 100 }
                    })
                  ],
                  columnSpan: 2
                })
              ]
            })
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 300 } }),

        // İmza Alanı
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE }
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: 'Başvuru Sahibi', bold: true, size: 22 })],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 100 }
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Ad Soyad: ' + candidateName, size: 20 })],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 50 }
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Tarih: ' + todayDate, size: 20 })],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 100 }
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'İmza: _______________________', size: 20 })],
                      alignment: AlignmentType.CENTER
                    })
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE }
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: 'İşveren / Yetkili', bold: true, size: 22 })],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 100 }
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Ad Soyad: _______________________', size: 20 })],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 50 }
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'Tarih: _______________________', size: 20 })],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 100 }
                    }),
                    new Paragraph({
                      children: [new TextRun({ text: 'İmza: _______________________', size: 20 })],
                      alignment: AlignmentType.CENTER
                    })
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE }
                })
              ]
            })
          ]
        }),

        new Paragraph({ children: [], spacing: { after: 200 } }),

        // Footer
        new Paragraph({
          children: [new TextRun({
            text: '4857 Sayılı İş Kanunu ve 6698 Sayılı KVKK kapsamında düzenlenmiştir.',
            size: 16,
            italics: true,
            color: '666666'
          })],
          alignment: AlignmentType.CENTER
        })
      ]
    }]
  });

  // Dosya kaydet
  const fileName = `basvuru_formu_${preRecord._id}_${Date.now()}.docx`;
  const dirPath = path.join(__dirname, '../uploads/employment/contracts/word');

  // Klasör yoksa oluştur
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const filePath = path.join(dirPath, fileName);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);

  return {
    fileName,
    filePath,
    fileUrl: `/uploads/employment/contracts/word/${fileName}`
  };
}

module.exports = {
  generateContract,
  generateJobApplicationForm,
  getContractTypeName,
  CONTRACT_TYPE_NAMES
};
