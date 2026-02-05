const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Bordro PDF Oluşturma Servisi
 * Çalışan bordrosunu profesyonel PDF formatında oluşturur
 * Türkçe karakter desteği için Roboto fontu kullanılır
 */

// Font dosyaları
const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'Roboto-Bold.ttf');

// Türkçe ay isimleri
const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// Para formatı
const formatCurrency = (value) => {
  if (value === null || value === undefined || value === 0) return '0,00 TL';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2
  }).format(value);
};

// Tarih formatı
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Metni belirli genişliğe sığdır (kırp veya küçült)
const truncateText = (text, maxLength) => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Bordro PDF'i oluştur
 * @param {Object} bordro - Bordro dokümanı (populated)
 * @param {Object} options - Opsiyonlar
 * @returns {Promise<Buffer>} PDF buffer
 */
const generateBordroPdf = async (bordro, options = {}) => {
  // PDFKit ile oluştur, sonra pdf-lib ile sadece 1 sayfa tut
  const pdfBuffer = await new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        info: {
          Title: `Bordro - ${MONTHS[bordro.month - 1]} ${bordro.year}`,
          Author: 'Personel Plus',
          Subject: 'Calisan Bordrosu',
          Keywords: 'bordro, maas, payroll'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Fontları kaydet (Türkçe karakter desteği için)
      if (fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD)) {
        doc.registerFont('Turkish', FONT_REGULAR);
        doc.registerFont('Turkish-Bold', FONT_BOLD);
      } else {
        console.warn('Roboto fontları bulunamadı, varsayılan font kullanılacak');
      }

      // Font seçimi
      const fontRegular = fs.existsSync(FONT_REGULAR) ? 'Turkish' : 'Helvetica';
      const fontBold = fs.existsSync(FONT_BOLD) ? 'Turkish-Bold' : 'Helvetica-Bold';

      // Şirket bilgileri
      const company = bordro.company || {};
      const employee = bordro.employee || {};
      const payroll = bordro.payrollData || {};

      // Sayfa genişliği
      const pageWidth = doc.page.width - 80; // 40px margin each side

      // Başlık
      doc.fontSize(18)
         .font(fontBold)
         .text('ÜCRET BORDROSU', 40, 40, { align: 'center', width: pageWidth });

      // Dönem bilgisi
      doc.fontSize(12)
         .font(fontRegular)
         .text(`${MONTHS[bordro.month - 1]} ${bordro.year}`, 40, 65, { align: 'center', width: pageWidth });

      // Başlangıç Y pozisyonunu manuel ayarla
      doc.y = 90;

      // Şirket ve çalışan bilgileri kutusu
      const startY = doc.y;
      const boxWidth = (pageWidth - 10) / 2; // 10px gap between boxes
      const boxHeight = 65;
      const leftBoxX = 40;
      const rightBoxX = leftBoxX + boxWidth + 10;

      // Sol kutu - Şirket Bilgileri
      doc.rect(leftBoxX, startY, boxWidth, boxHeight).stroke();
      doc.fontSize(9).font(fontBold);
      doc.text('ŞİRKET BİLGİLERİ', leftBoxX + 5, startY + 5, { width: boxWidth - 10, lineBreak: false });
      doc.font(fontRegular).fontSize(8);
      doc.text(`Şirket: ${truncateText(company.name, 35)}`, leftBoxX + 5, startY + 18, { width: boxWidth - 10, lineBreak: false });
      doc.text(`Vergi No: ${company.taxNumber || '-'}`, leftBoxX + 5, startY + 32, { width: boxWidth - 10, lineBreak: false });
      doc.text(`SGK No: ${company.sgkNumber || '-'}`, leftBoxX + 5, startY + 46, { width: boxWidth - 10, lineBreak: false });

      // Sağ kutu - Çalışan Bilgileri
      doc.rect(rightBoxX, startY, boxWidth, boxHeight).stroke();
      doc.fontSize(9).font(fontBold);
      doc.text('ÇALIŞAN BİLGİLERİ', rightBoxX + 5, startY + 5, { width: boxWidth - 10, lineBreak: false });
      doc.font(fontRegular).fontSize(8);
      doc.text(`Ad Soyad: ${truncateText(`${employee.firstName || ''} ${employee.lastName || ''}`, 30)}`, rightBoxX + 5, startY + 18, { width: boxWidth - 10, lineBreak: false });
      doc.text(`TC Kimlik: ${bordro.tcKimlik || '-'}`, rightBoxX + 5, startY + 32, { width: boxWidth - 10, lineBreak: false });
      doc.text(`Sicil No: ${employee.employeeNo || '-'}`, rightBoxX + 5, startY + 46, { width: boxWidth - 10, lineBreak: false });

      doc.y = startY + boxHeight + 10;

      // Bordro detayları tablosu
      const tableTop = doc.y;
      const col1 = 40;
      const col2 = 180;
      const col3 = 300;
      const col4 = 450;
      const rowHeight = 14;

      // Tablo başlığı
      doc.rect(40, tableTop, pageWidth, 20).fill('#f0f0f0');
      doc.fillColor('black')
         .fontSize(10)
         .font(fontBold)
         .text('BORDRO DETAYLARI', 45, tableTop + 5, { lineBreak: false });

      let currentY = tableTop + 25;

      // Satır çizme fonksiyonu - lineBreak: false ile sayfa taşmasını engelle
      const drawRow = (label1, value1, label2, value2, isEarning = false, isDeduction = false) => {
        doc.fontSize(8).font(fontRegular);

        doc.fillColor('black').text(label1, col1, currentY, { lineBreak: false });
        doc.font(fontBold);
        if (isEarning) doc.fillColor('#059669');
        if (isDeduction) doc.fillColor('#dc2626');
        doc.text(value1, col2, currentY, { width: 100, align: 'right', lineBreak: false });
        doc.fillColor('black');

        if (label2) {
          doc.font(fontRegular);
          doc.fillColor('black').text(label2, col3, currentY, { lineBreak: false });
          doc.font(fontBold);
          if (isEarning) doc.fillColor('#059669');
          if (isDeduction) doc.fillColor('#dc2626');
          doc.text(value2, col4, currentY, { width: 70, align: 'right', lineBreak: false });
          doc.fillColor('black');
        }

        currentY += rowHeight;
      };

      // Bölüm başlığı çizme - lineBreak: false
      const drawSectionHeader = (title) => {
        currentY += 3;
        doc.rect(40, currentY, pageWidth, 14).fill('#e5e7eb');
        doc.fillColor('black')
           .fontSize(8)
           .font(fontBold)
           .text(title, 45, currentY + 3, { lineBreak: false });
        currentY += 17;
      };

      // GÜN BİLGİLERİ
      drawSectionHeader('GÜN BİLGİLERİ');
      drawRow('Toplam Gün:', payroll.calismaGunu || '-', 'Normal Gün:', payroll.normalGun || '-');
      drawRow('İzin Günü:', payroll.izinGunu || '-', 'Eksik Gün:', payroll.eksikGun || '-');

      // KAZANÇLAR
      drawSectionHeader('KAZANÇLAR');
      drawRow('Normal Kazanç:', formatCurrency(payroll.normalKazanc), 'Diğer Kazanç:', formatCurrency(payroll.digerKazanc), true);
      drawRow('Brüt Ücret:', formatCurrency(payroll.brutUcret), '', '', true);
      if (payroll.fazlaMesaiTutar) {
        drawRow('Fazla Mesai:', formatCurrency(payroll.fazlaMesaiTutar), 'Süre:', payroll.fazlaMesaiSaat || '-', true);
      }
      if (payroll.geceMesaisiTutar) {
        drawRow('Gece Mesaisi:', formatCurrency(payroll.geceMesaisiTutar), 'Süre:', payroll.geceMesaisiSaat || '-', true);
      }

      // SGK/SSK
      drawSectionHeader('SGK/SSK KESİNTİLERİ');
      drawRow('SSK Matrah:', formatCurrency(payroll.sskMatrah), 'SSK İşveren:', formatCurrency(payroll.sskIsveren));
      drawRow('SSK İşçi:', formatCurrency(payroll.sgkKesinti), 'İşsizlik Primi:', formatCurrency(payroll.issizlikPrimi), false, true);

      // GELİR VERGİSİ
      drawSectionHeader('GELİR VERGİSİ');
      drawRow('G.V. Matrah:', formatCurrency(payroll.gvMatrah), 'Toplam GVM:', formatCurrency(payroll.toplamGvMatrah));
      drawRow('Gelir Vergisi:', formatCurrency(payroll.gelirVergisi), 'Kalan GV:', formatCurrency(payroll.kalanGelirVergisi), false, true);

      // DİĞER KESİNTİLER
      drawSectionHeader('DİĞER KESİNTİLER');
      drawRow('Damga Vergisi:', formatCurrency(payroll.damgaVergisi), 'Özel Kesinti:', formatCurrency(payroll.ozelKesinti), false, true);

      // NET ÖDEME
      currentY += 8;
      doc.rect(40, currentY, pageWidth, 28).fill('#1e40af');
      doc.fillColor('white').fontSize(12).font(fontBold);
      doc.text('NET ÖDENEN:', 50, currentY + 8, { lineBreak: false });
      doc.fontSize(14);
      doc.text(formatCurrency(payroll.netOdenen), 350, currentY + 6, { width: 160, align: 'right', lineBreak: false });
      doc.fillColor('black');

      currentY += 38;

      // Onay Bilgileri
      if (bordro.status === 'approved' || bordro.companyApprovedAt || bordro.employeeApprovedAt) {
        doc.rect(40, currentY, pageWidth, 45).stroke();
        doc.fontSize(9).font(fontBold);
        doc.text('ONAY BİLGİLERİ', 45, currentY + 5, { lineBreak: false });
        doc.font(fontRegular).fontSize(8);
        doc.text(`Çalışan Onay Tarihi: ${bordro.employeeApprovedAt ? formatDate(bordro.employeeApprovedAt) : '-'}`, 45, currentY + 18, { lineBreak: false });
        doc.text(`Şirket Onay Tarihi: ${bordro.companyApprovedAt ? formatDate(bordro.companyApprovedAt) : '-'}`, 45, currentY + 30, { lineBreak: false });

        if (bordro.timestampedAt) {
          doc.text(`Zaman Damgası: ${formatDate(bordro.timestampedAt)}`, 280, currentY + 18, { lineBreak: false });
          if (bordro.timestampToken?.tsaName) {
            doc.text(`TSA: ${bordro.timestampToken.tsaName}`, 280, currentY + 30, { lineBreak: false });
          }
        }
        currentY += 55;
      }

      // Alt bilgi - sabit pozisyonda
      const footerY = doc.page.height - 50;
      doc.fontSize(6)
         .font(fontRegular)
         .fillColor('gray');

      doc.text(
        'Bu belge elektronik ortamda oluşturulmuş olup, zaman damgası ile güvence altına alınmıştır.',
        40, footerY,
        { align: 'center', width: pageWidth, lineBreak: false }
      );

      doc.text(
        `Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')} | Belge ID: ${bordro._id}`,
        40, footerY + 12,
        { align: 'center', width: pageWidth, lineBreak: false }
      );

      doc.text(
        'Powered By Personel Plus',
        40, footerY + 24,
        { align: 'center', width: pageWidth, lineBreak: false }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });

  // pdf-lib ile fazla sayfaları kaldır - sadece ilk sayfayı tut
  const { PDFDocument: PDFLib } = require('pdf-lib');
  const pdfDoc = await PDFLib.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();

  if (pageCount > 1) {
    console.log(`PDF ${pageCount} sayfa oluşturdu, fazla sayfalar kaldırılıyor...`);
    // Son sayfadan geriye doğru sil (index kayması olmasın diye)
    for (let i = pageCount - 1; i > 0; i--) {
      pdfDoc.removePage(i);
    }
  }

  return Buffer.from(await pdfDoc.save());
};

/**
 * Zaman damgası bilgisini PDF'e ekle
 * @param {Buffer} pdfBuffer - Orijinal PDF
 * @param {Object} timestampInfo - Zaman damgası bilgileri
 * @returns {Promise<Buffer>} Güncellenmiş PDF
 */
const addTimestampInfoToPdf = async (pdfBuffer, timestampInfo) => {
  const { PDFDocument: PDFLib, StandardFonts, rgb } = require('pdf-lib');

  const pdfDoc = await PDFLib.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Zaman damgası bilgisi kutusu
  const boxY = 60;
  const boxHeight = 35;
  const boxWidth = 515;
  const boxX = 40;

  // Arka plan
  firstPage.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0.2, 0.4, 0.8),
    borderWidth: 1,
    color: rgb(0.95, 0.97, 1)
  });

  // Başlık
  firstPage.drawText('ZAMAN DAMGASI BILGISI', {
    x: boxX + 5,
    y: boxY + boxHeight - 10,
    size: 8,
    font: helveticaBold,
    color: rgb(0.1, 0.2, 0.5)
  });

  // Bilgiler
  const infoY = boxY + boxHeight - 22;
  firstPage.drawText(`Zaman: ${timestampInfo.genTime || '-'}`, {
    x: boxX + 5,
    y: infoY,
    size: 6,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3)
  });

  firstPage.drawText(`TSA: ${timestampInfo.tsaName || '-'}`, {
    x: boxX + 180,
    y: infoY,
    size: 6,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3)
  });

  firstPage.drawText(`Seri No: ${timestampInfo.serialNumber || '-'}`, {
    x: boxX + 5,
    y: infoY - 10,
    size: 6,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3)
  });

  firstPage.drawText(`Hash: ${(timestampInfo.messageImprint || '').substring(0, 40)}...`, {
    x: boxX + 180,
    y: infoY - 10,
    size: 6,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3)
  });

  return Buffer.from(await pdfDoc.save());
};

module.exports = {
  generateBordroPdf,
  addTimestampInfoToPdf,
  formatCurrency,
  formatDate,
  MONTHS
};
