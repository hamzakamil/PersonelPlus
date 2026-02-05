const xlsx = require('xlsx');
const Bordro = require('../models/Bordro');
const Employee = require('../models/Employee');

// Ay isimleri
const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

/**
 * Ay numarasından ay adını döndür
 */
const getMonthName = (month) => {
  return MONTH_NAMES[month - 1] || '';
};

/**
 * Email adresini maskele
 */
const maskEmail = (email) => {
  if (!email) return '***';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  const maskedLocal = local[0] + '***' + (local.length > 1 ? local[local.length - 1] : '');
  return `${maskedLocal}@${domain}`;
};

/**
 * Kolon başlıkları için esnek eşleştirme haritası
 * Her alan için olası başlık isimleri
 * Gerçek Excel dosyası formatına göre güncellendi
 */
/**
 * Kolon başlıkları için tam eşleştirme haritası
 * Excel dosyasındaki başlıklara göre ayarlandı
 */
const HEADER_ALIASES = {
  // Kimlik Bilgileri
  tcKimlik: ['TCKN', 'T.C. KİMLİK NO', 'TC KİMLİK NO', 'TC KİMLİK', 'TCKIMLIK'],
  adSoyad: ['Adı Soyadı', 'ADI SOYADI', 'Ad Soyad', 'İsim'],

  // Gün Bilgileri
  eksikGun: ['Eksik Gün', 'EKSİK GÜN'],
  calismaGunu: ['T.Gün', 'GÜN', 'Gün', 'ÇALIŞMA GÜNÜ'],
  normalGun: ['Normal Gün', 'NORMAL GÜN'],
  izinGunu: ['İz.Gün', 'İZİN GÜNÜ'],

  // Kanun ve Ücret Tipi
  kanun: ['Kanun', 'KANUN'],
  ucretGunSaat: ['Ücret G/S', 'ÜCRET G/S'],

  // Kazançlar
  normalKazanc: ['Nor.Kazanç', 'NORMAL KAZANÇ', 'Normal Kazanç'],
  brutUcret: ['Top.Kazanç', 'TOPLAM KAZANÇ', 'Toplam Kazanç', 'BRÜT ÜCRET'],
  digerKazanc: ['Diğ.Kazanç', 'DİĞER KAZANÇ', 'Diğer Kazanç'],

  // SGK/SSK Kesintileri
  sskMatrah: ['SSK M.', 'SSK MATRAH', 'Ssk Matrah', 'SGK MATRAH'],
  sskIsveren: ['SSK İşveren', 'SSK İŞVEREN'],
  sgkKesinti: ['SSK İşçi', 'SSK PRİMİ', 'Ssk Primi', 'SGK PRİMİ', 'SGK KESİNTİ'],
  issizlikPrimi: ['İşsizlik', 'İşsizlik Primi', 'İşsizlik P.', 'İşs.Primi', 'İŞSİZLİK PRİMİ', 'İŞSİZLİK'],

  // Gelir Vergisi
  gvMatrah: ['G.V.M', 'G.V.M.  (AYLIK)', 'G.V.M. (AYLIK)', 'GVM AYLIK', 'GV MATRAH'],
  toplamGvMatrah: ['Top.GVM', 'TOPLAM GVM'],
  gelirVergisi: ['Gel.Ver.', 'GELİR VERGİSİ', 'Gelir Vergisi', 'G.VERGİSİ'],
  kalanGelirVergisi: ['Kalan GV', 'KALAN G.VER.', 'Kalan G.Ver.', 'KALAN GV'],

  // Diğer Kesintiler
  damgaVergisi: ['Damga V', 'DAMGA VERGİSİ', 'Damga Vergisi'],
  ozelKesinti: ['Öz.Kesinti', 'ÖZEL KESİNTİ', 'Özel Kesinti'],

  // Net Ödeme
  netOdenen: ['N.Ödenen', 'Net Ödenen', 'NET İSTİHKAK', 'Net İstihkak', 'NET ÖDENEN'],

  // Mesai - Süre ve Tutar ayrı kolonlarda
  // Excel'de "Fazla Mesai" başlığı altında 2 kolon var: süre (sol) ve tutar (sağ)
  fazlaMesaiSaat: ['Fazla Mesai', 'FAZLA MESAİ'],  // İlk eşleşen kolon (süre)
  geceMesaisiSaat: ['Gece Mesaisi', 'GECE MESAİSİ'] // İlk eşleşen kolon (süre)
};

/**
 * Başlık satırından kolon indekslerini bul
 * Tam eşleşme kullanır - kısmi eşleşme yok
 */
const mapHeaders = (headers) => {
  const headerMap = {};

  console.log('=== Excel Başlıkları ===');
  headers.forEach((h, i) => {
    if (h) console.log(`  [${i}] "${h}"`);
  });

  // Normalize fonksiyonu
  const normalize = (str) => String(str).trim().toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

  headers.forEach((header, index) => {
    if (!header) return;
    const normalizedHeader = normalize(header);

    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      for (const alias of aliases) {
        const normalizedAlias = normalize(alias);

        // TAM EŞLEŞMEkullan
        if (normalizedHeader === normalizedAlias) {
          if (!headerMap[field]) {
            headerMap[field] = index;
            console.log(`  Eşleşme: "${header}" -> ${field}`);

            // Fazla Mesai ve Gece Mesaisi için sonraki kolon tutarı içerir
            if (field === 'fazlaMesaiSaat' && headers[index + 1] !== undefined) {
              headerMap['fazlaMesaiTutar'] = index + 1;
              console.log(`  Eşleşme: [kolon ${index + 1}] -> fazlaMesaiTutar`);
            }
            if (field === 'geceMesaisiSaat' && headers[index + 1] !== undefined) {
              headerMap['geceMesaisiTutar'] = index + 1;
              console.log(`  Eşleşme: [kolon ${index + 1}] -> geceMesaisiTutar`);
            }
          }
          break;
        }
      }
    }
  });

  console.log('=== Eşleştirme Sonucu ===');
  console.log(headerMap);

  return headerMap;
};

/**
 * Türkçe sayı formatını parse et
 * Türkçe format: 53.100,00 = 53100.00 (nokta binlik ayraç, virgül ondalık ayraç)
 * Örnek: "1.234.567,89" → 1234567.89
 */
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  // Sayı ise direkt döndür (xlsx bazen number olarak okur)
  if (typeof value === 'number') return value;

  // String'e çevir ve boşlukları temizle
  let str = String(value).trim();

  // Boş string kontrolü
  if (str === '' || str === '-') return 0;

  // TL, ₺ gibi para birimi sembollerini kaldır
  str = str.replace(/[TL₺\s]/gi, '');

  // Türkçe format kontrolü: nokta binlik, virgül ondalık
  // Örnek: "53.100,00" veya "1.234.567,89"
  const turkishPattern = /^-?[\d.]+,\d{1,2}$/;
  const hasTurkishFormat = turkishPattern.test(str) ||
                           (str.includes('.') && str.includes(',') && str.lastIndexOf('.') < str.lastIndexOf(','));

  if (hasTurkishFormat) {
    // Türkçe format: nokta binlik ayraç, virgül ondalık ayraç
    // 53.100,00 → 53100.00
    str = str.replace(/\./g, '');  // Binlik noktalarını kaldır
    str = str.replace(',', '.');   // Ondalık virgülü noktaya çevir
  } else if (str.includes(',') && !str.includes('.')) {
    // Sadece virgül var, ondalık ayraç olarak kullan: "53100,00" → "53100.00"
    str = str.replace(',', '.');
  } else if (str.includes('.') && str.includes(',')) {
    // Amerikan/İngiliz formatı olabilir: "53,100.00"
    // Virgül binlik, nokta ondalık
    str = str.replace(/,/g, '');
  }
  // Sadece nokta varsa (53100.00) veya hiç ayraç yoksa olduğu gibi bırak

  // Sadece sayısal karakterler ve nokta/eksi bırak
  str = str.replace(/[^\d.-]/g, '');

  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * TC Kimlik No'yu temizle
 */
const cleanTcKimlik = (value) => {
  if (!value) return null;
  return String(value).replace(/\D/g, '').trim();
};

/**
 * Detay satırından fazla mesai bilgisini parse et
 * Örnek: "Fazla Mesai (27S): 7.200,00 N" -> { saat: "27S", tutar: 7200 }
 */
const parseFazlaMesaiDetail = (text) => {
  if (!text) return null;
  const match = String(text).match(/Fazla Mesai\s*\(([^)]+)\):\s*([\d.,]+)/i);
  if (match) {
    return {
      saat: match[1].trim(),
      tutar: parseNumber(match[2])
    };
  }
  return null;
};

/**
 * Detay satırından gece mesaisi bilgisini parse et
 * Örnek: "Gece Mesaisi (10S): 3.000,00 N" -> { saat: "10S", tutar: 3000 }
 */
const parseGeceMesaisiDetail = (text) => {
  if (!text) return null;
  const match = String(text).match(/Gece Mesaisi\s*\(([^)]+)\):\s*([\d.,]+)/i);
  if (match) {
    return {
      saat: match[1].trim(),
      tutar: parseNumber(match[2])
    };
  }
  return null;
};

/**
 * Detay satırından normal gün bilgisini parse et
 * Örnek: "Normal Gün (30G): 40.000,00 N" -> { gun: "30G", tutar: 40000 }
 */
const parseNormalGunDetail = (text) => {
  if (!text) return null;
  const match = String(text).match(/Normal Gün\s*\(([^)]+)\):\s*([\d.,]+)/i);
  if (match) {
    return {
      gun: match[1].trim(),
      tutar: parseNumber(match[2])
    };
  }
  return null;
};

/**
 * Detay satırından net kazanç bilgisini parse et
 * Örnek: "Net Kazanç: 47.200,00" -> 47200
 */
const parseNetKazancDetail = (text) => {
  if (!text) return null;
  const match = String(text).match(/Net Kazanç:\s*([\d.,]+)/i);
  if (match) {
    return parseNumber(match[1]);
  }
  return null;
};

/**
 * Excel dosyasını işle ve bordro kayıtları oluştur
 * Multi-row format desteği: Her çalışan için birden fazla satır olabilir
 * - Ana satır: İlk kolonda numara (#), TCKN ve tüm bordro verileri
 * - Alt satırlar: "Normal Gün", "Fazla Mesai", "Net Kazanç" detayları
 */
const processExcelFile = async (filePath, companyId, uploadId, year, month) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Tüm verileri array of arrays olarak al
  const allData = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false
  });

  const result = {
    totalRows: 0,
    successCount: 0,
    errors: [],
    warnings: [],  // Net Ödenen doğrulama uyarıları
    companyMetadata: { rawData: {} }
  };

  // İlk 9 satırı metadata olarak sakla
  for (let i = 0; i < Math.min(9, allData.length); i++) {
    const row = allData[i];
    if (row && row.length > 0) {
      const key = row[0] ? String(row[0]).trim() : `row_${i + 1}`;
      const value = row[2] ? String(row[2]).trim() : (row[1] ? String(row[1]).trim() : '');
      result.companyMetadata.rawData[key] = value;

      // Bilinen alanları eşleştir
      const keyLower = key.toLowerCase();
      if (keyLower.includes('kurum') || keyLower.includes('şirket') || keyLower.includes('unvan')) {
        result.companyMetadata.companyName = value;
      } else if (keyLower.includes('vergi') && keyLower.includes('no')) {
        result.companyMetadata.taxNumber = value;
      } else if (keyLower.includes('sgk') && keyLower.includes('no')) {
        result.companyMetadata.sgkNumber = value;
      }
    }
  }

  // 10. satır başlıklar
  if (allData.length < 10) {
    result.errors.push({ row: 0, message: 'Excel dosyasında yeterli satır bulunamadı' });
    return result;
  }

  const headers = allData[9] || [];
  const headerMap = mapHeaders(headers);

  // TC Kimlik kolonu zorunlu
  if (headerMap.tcKimlik === undefined) {
    result.errors.push({ row: 10, message: 'TC Kimlik No kolonu bulunamadı' });
    return result;
  }

  // Çalışan gruplarını ayır
  // Ana satır belirleme stratejisi:
  // 1. TC Kimlik kolonu dolu ise ana satır
  // 2. Alternatif: ilk kolonda sayı var (eski format için)
  // Alt satır: TC Kimlik boş, detay bilgisi içerir
  const employeeGroups = [];
  let currentGroup = null;

  for (let i = 10; i < allData.length; i++) {
    const row = allData[i];
    if (!row || row.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue; // Boş satırı atla
    }

    // TC Kimlik değerini kontrol et
    const tcKimlikValue = row[headerMap.tcKimlik];
    const cleanedTcKimlik = cleanTcKimlik(tcKimlikValue);
    const hasTcKimlik = cleanedTcKimlik && cleanedTcKimlik.length >= 10;

    // İlk kolon sayı mı kontrol et (eski format için)
    const firstCol = row[0];
    const firstColIsNumber = firstCol !== '' && firstCol !== null && !isNaN(Number(firstCol));

    // Ana satır: TC Kimlik dolu VEYA ilk kolon sayı
    const isMainRow = hasTcKimlik || firstColIsNumber;

    if (isMainRow) {
      // Yeni çalışan başlıyor
      if (currentGroup) {
        employeeGroups.push(currentGroup);
      }
      currentGroup = {
        mainRow: row,
        mainRowIndex: i + 1,
        detailRows: []
      };
    } else if (currentGroup) {
      // Alt satır (detay)
      currentGroup.detailRows.push({
        row: row,
        rowIndex: i + 1
      });
    }
  }

  // Son grubu ekle
  if (currentGroup) {
    employeeGroups.push(currentGroup);
  }

  console.log(`Toplam ${employeeGroups.length} çalışan grubu bulundu`);

  // Her çalışan grubunu işle
  for (const group of employeeGroups) {
    result.totalRows++;
    const row = group.mainRow;
    const rowNumber = group.mainRowIndex;

    try {
      // TC Kimlik'i al ve temizle
      const tcKimlik = cleanTcKimlik(row[headerMap.tcKimlik]);

      if (!tcKimlik) {
        result.errors.push({
          row: rowNumber,
          tcKimlik: '',
          message: 'TC Kimlik No boş'
        });
        continue;
      }

      if (tcKimlik.length !== 11) {
        result.errors.push({
          row: rowNumber,
          tcKimlik: tcKimlik,
          message: 'Geçersiz TC Kimlik No (11 hane olmalı)'
        });
        continue;
      }

      // Çalışanı bul
      const employee = await Employee.findOne({
        tcKimlik: tcKimlik,
        company: companyId,
        status: 'active'
      });

      if (!employee) {
        result.errors.push({
          row: rowNumber,
          tcKimlik: tcKimlik,
          employeeName: headerMap.adSoyad !== undefined ? row[headerMap.adSoyad] : '',
          message: 'Çalışan bulunamadı'
        });
        continue;
      }

      // Alt satırlardan detay bilgilerini parse et
      let fazlaMesaiInfo = null;
      let geceMesaisiInfo = null;
      let normalGunInfo = null;
      let netKazancFromDetail = null;

      for (const detail of group.detailRows) {
        const detailText = detail.row[1] || ''; // İkinci kolonda detay bilgisi var

        // Fazla Mesai
        const fazlaMesai = parseFazlaMesaiDetail(detailText);
        if (fazlaMesai) {
          fazlaMesaiInfo = fazlaMesai;
          console.log(`  Satır ${detail.rowIndex}: Fazla Mesai bulundu - ${fazlaMesai.saat}, ${fazlaMesai.tutar} TL`);
        }

        // Gece Mesaisi
        const geceMesaisi = parseGeceMesaisiDetail(detailText);
        if (geceMesaisi) {
          geceMesaisiInfo = geceMesaisi;
          console.log(`  Satır ${detail.rowIndex}: Gece Mesaisi bulundu - ${geceMesaisi.saat}, ${geceMesaisi.tutar} TL`);
        }

        // Normal Gün
        const normalGun = parseNormalGunDetail(detailText);
        if (normalGun) {
          normalGunInfo = normalGun;
        }

        // Net Kazanç
        const netKazanc = parseNetKazancDetail(detailText);
        if (netKazanc !== null) {
          netKazancFromDetail = netKazanc;
        }
      }

      // Bordro verilerini hazırla
      const payrollData = {
        // Gün Bilgileri
        eksikGun: row[headerMap.eksikGun] || '',
        calismaGunu: parseNumber(row[headerMap.calismaGunu]),
        normalGun: parseNumber(row[headerMap.normalGun]) || (normalGunInfo ? parseInt(normalGunInfo.gun) : 0),
        izinGunu: parseNumber(row[headerMap.izinGunu]),

        // Kanun ve Ücret Tipi
        kanun: row[headerMap.kanun] || '',
        ucretGunSaat: row[headerMap.ucretGunSaat] || '',

        // Kazançlar
        normalKazanc: parseNumber(row[headerMap.normalKazanc]) || (normalGunInfo ? normalGunInfo.tutar : 0),
        brutUcret: parseNumber(row[headerMap.brutUcret]),
        digerKazanc: parseNumber(row[headerMap.digerKazanc]),

        // SGK/SSK
        sskMatrah: parseNumber(row[headerMap.sskMatrah]),
        sskIsveren: parseNumber(row[headerMap.sskIsveren]),
        sgkKesinti: parseNumber(row[headerMap.sgkKesinti]),
        issizlikPrimi: parseNumber(row[headerMap.issizlikPrimi]),

        // Gelir Vergisi
        gvMatrah: parseNumber(row[headerMap.gvMatrah]),
        toplamGvMatrah: parseNumber(row[headerMap.toplamGvMatrah]),
        gelirVergisi: parseNumber(row[headerMap.gelirVergisi]),
        kalanGelirVergisi: parseNumber(row[headerMap.kalanGelirVergisi]),

        // Kesintiler
        damgaVergisi: parseNumber(row[headerMap.damgaVergisi]),
        ozelKesinti: parseNumber(row[headerMap.ozelKesinti]),

        // Net Ödeme - önce ana satırdan, yoksa detaydan
        netOdenen: parseNumber(row[headerMap.netOdenen]) || netKazancFromDetail || 0,

        // Mesai - Alt satırlardan parse edilen değerler
        fazlaMesaiSaat: fazlaMesaiInfo ? fazlaMesaiInfo.saat : '',
        fazlaMesaiTutar: fazlaMesaiInfo ? fazlaMesaiInfo.tutar : 0,
        geceMesaisiSaat: geceMesaisiInfo ? geceMesaisiInfo.saat : '',
        geceMesaisiTutar: geceMesaisiInfo ? geceMesaisiInfo.tutar : 0,

        // Tüm satırı ham veri olarak sakla
        rawData: {}
      };

      // Ham veriyi başlıklarla eşleştir
      headers.forEach((header, idx) => {
        if (header && row[idx] !== undefined) {
          payrollData.rawData[header] = row[idx];
        }
      });

      // Alt satırları da rawData'ya ekle
      payrollData.rawData._detailRows = group.detailRows.map(d => d.row[1]);

      // Net Ödenen doğrulaması
      // Formül: Net Ödenen = Brüt Ücret - SSK İşçi - İşsizlik Primi - Kalan GV - Damga Vergisi - Özel Kesinti
      const calculatedNetOdenen = payrollData.brutUcret
        - payrollData.sgkKesinti
        - payrollData.issizlikPrimi
        - payrollData.kalanGelirVergisi
        - payrollData.damgaVergisi
        - payrollData.ozelKesinti;

      const netOdenenDiff = Math.abs(calculatedNetOdenen - payrollData.netOdenen);

      // 1 TL'den fazla fark varsa uyarı ver (yuvarlama hatalarını tolere et)
      if (netOdenenDiff > 1) {
        result.warnings.push({
          row: rowNumber,
          tcKimlik: tcKimlik,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          message: `Net Ödenen tutarı uyuşmuyor`,
          details: {
            excelNetOdenen: payrollData.netOdenen,
            calculatedNetOdenen: Math.round(calculatedNetOdenen * 100) / 100,
            difference: Math.round(netOdenenDiff * 100) / 100,
            formula: `${payrollData.brutUcret} - ${payrollData.sgkKesinti} - ${payrollData.issizlikPrimi} - ${payrollData.kalanGelirVergisi} - ${payrollData.damgaVergisi} - ${payrollData.ozelKesinti}`
          }
        });
        console.log(`⚠️ Net Ödenen uyarısı - ${employee.firstName} ${employee.lastName}: Excel=${payrollData.netOdenen}, Hesaplanan=${calculatedNetOdenen.toFixed(2)}, Fark=${netOdenenDiff.toFixed(2)}`);
      }

      console.log(`Çalışan: ${employee.firstName} ${employee.lastName}, Net Ödenen: ${payrollData.netOdenen}, Fazla Mesai: ${payrollData.fazlaMesaiSaat} - ${payrollData.fazlaMesaiTutar}`);

      // Mevcut bordro var mı kontrol et
      const existingBordro = await Bordro.findOne({
        employee: employee._id,
        year: year,
        month: month
      });

      if (existingBordro) {
        // Mevcut bordronun durumuna göre işlem yap
        if (existingBordro.status === 'approved') {
          // Çalışan onaylamış bordro - güncelleme yapma, atla
          result.skippedApproved = (result.skippedApproved || 0) + 1;
          console.log(`⏭️ Atlandı (çalışan onaylı): ${employee.firstName} ${employee.lastName}`);
          continue;
        }

        if (existingBordro.status === 'company_approved') {
          // Şirket onaylı, çalışan onayı bekliyor - güncelleme yapma, atla
          result.skippedCompanyApproved = (result.skippedCompanyApproved || 0) + 1;
          console.log(`⏭️ Atlandı (şirket onaylı, çalışan onayı bekliyor): ${employee.firstName} ${employee.lastName}`);
          continue;
        }

        if (existingBordro.status === 'rejected') {
          // Reddedilmiş (itiraz edilmiş) bordro - güncelle
          existingBordro.upload = uploadId;
          existingBordro.tcKimlik = tcKimlik;
          existingBordro.employeeName = `${employee.firstName} ${employee.lastName}`;
          existingBordro.payrollData = payrollData;
          existingBordro.status = 'pending'; // Tekrar onay sürecine girer
          existingBordro.employeeApprovalCode = null;
          existingBordro.employeeApprovalCodeExpires = null;
          existingBordro.employeeApprovalCodeAttempts = 0;
          existingBordro.employeeApprovedAt = null;
          existingBordro.employeeApprovedIp = null;
          existingBordro.companyApprovedAt = null;
          existingBordro.companyApprovedBy = null;
          existingBordro.rejectedAt = null;
          existingBordro.rejectionReason = null;
          existingBordro.rejectionNotifiedToDealer = false;
          await existingBordro.save();
          result.updatedRejected = (result.updatedRejected || 0) + 1;
          console.log(`🔄 Güncellendi (reddedilmiş): ${employee.firstName} ${employee.lastName}`);
        } else {
          // pending durumundaki bordro - güncelle
          existingBordro.upload = uploadId;
          existingBordro.tcKimlik = tcKimlik;
          existingBordro.employeeName = `${employee.firstName} ${employee.lastName}`;
          existingBordro.payrollData = payrollData;
          await existingBordro.save();
          console.log(`🔄 Güncellendi (bekleyen): ${employee.firstName} ${employee.lastName}`);
        }
      } else {
        // Yeni oluştur
        await Bordro.create({
          employee: employee._id,
          company: companyId,
          upload: uploadId,
          year: year,
          month: month,
          tcKimlik: tcKimlik,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          payrollData: payrollData,
          status: 'pending'
        });
      }

      result.successCount++;

    } catch (err) {
      result.errors.push({
        row: rowNumber,
        tcKimlik: row[headerMap.tcKimlik] || '',
        message: err.message
      });
    }
  }

  return result;
};

/**
 * Örnek Excel şablonu oluştur
 * Gerçek Excel formatına uygun olarak güncellendi
 */
const generateTemplate = () => {
  const workbook = xlsx.utils.book_new();

  // Şirket bilgileri (1-9. satırlar)
  const companyInfo = [
    ['Şirket Adı:', 'ABC Şirketi'],
    ['Vergi No:', '1234567890'],
    ['SGK İşyeri No:', '12345678901234567890123456'],
    ['Adres:', 'Örnek Mah. Test Sok. No:1'],
    ['Dönem:', 'Ocak 2026'],
    ['', ''],
    ['', ''],
    ['', ''],
    ['', '']
  ];

  // Başlık satırı (10. satır) - Gerçek Excel formatına göre
  const headers = [
    'Adı Soyadı',
    'TCKN',
    'Normal Gün',
    'T.Gün',
    'Nor.Kazanç',
    'Top.Kazanç',
    'SSK İşveren',
    'AGİ',
    'Gel.Ver.',
    'Damga V',
    'Öz.Kesinti',
    'Net Kazanç',
    'Fazla Mesai'
  ];

  // Örnek veri satırları
  const sampleData = [
    ['Ahmet Yılmaz', '12345678901', 22, 30, 40000, 50000, 7000, 500, 5000, 380, 0, 39620, 2000],
    ['Ayşe Kaya', '98765432109', 20, 28, 36000, 45000, 6300, 450, 4200, 342, 1000, 33208, 0]
  ];

  const worksheetData = [
    ...companyInfo,
    headers,
    ...sampleData,
    [], // Boş satır
    [], // Boş satır
    ['Powered By Personel Plus'] // Footer
  ];

  const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

  // Sütun genişlikleri
  worksheet['!cols'] = [
    { wch: 20 },  // Adı Soyadı
    { wch: 15 },  // TCKN
    { wch: 12 },  // Normal Gün
    { wch: 10 },  // T.Gün
    { wch: 12 },  // Nor.Kazanç
    { wch: 12 },  // Top.Kazanç
    { wch: 12 },  // SSK İşveren
    { wch: 10 },  // AGİ
    { wch: 12 },  // Gel.Ver.
    { wch: 12 },  // Damga V
    { wch: 12 },  // Öz.Kesinti
    { wch: 12 },  // Net Kazanç
    { wch: 12 }   // Fazla Mesai
  ];

  xlsx.utils.book_append_sheet(workbook, worksheet, 'Bordro');

  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  getMonthName,
  maskEmail,
  processExcelFile,
  generateTemplate,
  mapHeaders,
  parseNumber,
  cleanTcKimlik,
  parseFazlaMesaiDetail,
  parseGeceMesaisiDetail,
  parseNormalGunDetail,
  parseNetKazancDetail,
  MONTH_NAMES,
  HEADER_ALIASES
};
