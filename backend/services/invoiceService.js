const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Dealer = require('../models/Dealer');
const DealerSubscription = require('../models/DealerSubscription');
const Package = require('../models/Package');
const emailService = require('./emailService');

/**
 * Ödeme için fatura oluştur
 * @param {String} paymentId - Payment ID
 * @returns {Object} Oluşturulan fatura
 */
const generateInvoice = async (paymentId) => {
  const payment = await Payment.findById(paymentId)
    .populate('dealer')
    .populate('package');

  if (!payment) {
    throw new Error('Ödeme bulunamadı');
  }

  if (payment.status !== 'completed') {
    throw new Error('Sadece tamamlanmış ödemeler için fatura oluşturulabilir');
  }

  // Zaten fatura oluşturulmuş mu kontrol et
  const existingInvoice = await Invoice.findOne({ payment: paymentId });
  if (existingInvoice) {
    return existingInvoice;
  }

  const dealer = payment.dealer;
  const pkg = payment.package;

  // KDV hesapla (%20)
  const taxRate = 20;
  const lineExtensionAmount = payment.amount; // KDV hariç
  const taxAmount = (lineExtensionAmount * taxRate) / 100;
  const totalAmount = lineExtensionAmount + taxAmount;

  // İndirim varsa
  const discount = payment.discount || 0;
  const payableAmount = totalAmount - discount;

  // Fatura kalemi oluştur
  const invoiceLine = {
    lineId: '1',
    item: {
      name: pkg ? `${pkg.name} Paketi - ${payment.billingPeriod === 'yearly' ? 'Yıllık' : 'Aylık'} Abonelik` : 'PersonelPlus Abonelik',
      description: pkg ? `${pkg.employeeLimit} çalışan kapasiteli abonelik paketi` : 'PersonelPlus abonelik hizmeti',
      sellersItemIdentification: pkg ? pkg.code : 'SUBSCRIPTION'
    },
    quantity: {
      value: 1,
      unitCode: 'C62' // Adet
    },
    price: {
      priceAmount: lineExtensionAmount,
      currencyId: 'TRY'
    },
    lineExtensionAmount,
    taxTotal: {
      taxAmount,
      taxSubtotal: [{
        taxableAmount: lineExtensionAmount,
        taxAmount,
        percent: taxRate,
        taxCategory: {
          taxScheme: {
            name: 'KDV',
            taxTypeCode: '0015'
          }
        }
      }]
    }
  };

  // İndirim varsa ekle
  if (discount > 0) {
    invoiceLine.allowanceCharge = [{
      chargeIndicator: false, // İndirim
      amount: discount,
      baseAmount: totalAmount,
      reason: payment.campaignCode ? `Kampanya kodu: ${payment.campaignCode}` : 'İndirim'
    }];
  }

  // Fatura oluştur
  const invoice = new Invoice({
    issueDate: new Date(),
    profileId: 'EARSIVFATURA', // E-Arşiv fatura
    isEArchive: true,

    // Satıcı bilgileri (Sistem sahibi - .env'den alınmalı)
    accountingSupplierParty: {
      party: {
        partyIdentification: {
          schemeId: 'VKN',
          id: process.env.COMPANY_TAX_NUMBER || '1234567890' // .env'den alınmalı
        },
        partyName: process.env.COMPANY_NAME || 'PersonelPlus Bilişim A.Ş.',
        postalAddress: {
          streetName: process.env.COMPANY_ADDRESS || 'Merkez Mahallesi, Teknoloji Caddesi No:1',
          cityName: process.env.COMPANY_CITY || 'İstanbul',
          postalZone: process.env.COMPANY_POSTAL_CODE || '34000',
          country: {
            identificationCode: 'TR',
            name: 'Türkiye'
          }
        },
        partyTaxScheme: {
          taxScheme: {
            name: process.env.COMPANY_TAX_OFFICE || 'Kadıköy'
          }
        },
        contact: {
          telephone: process.env.COMPANY_PHONE || '+90 555 123 45 67',
          electronicMail: process.env.COMPANY_EMAIL || 'fatura@personelplus.com'
        }
      }
    },

    // Alıcı bilgileri (Bayi)
    accountingCustomerParty: {
      party: {
        partyIdentification: {
          schemeId: dealer.taxNumber ? 'VKN' : 'TCKN',
          id: dealer.taxNumber || dealer.ownerTc || '00000000000'
        },
        partyName: dealer.name,
        postalAddress: {
          streetName: dealer.address || '',
          cityName: dealer.city || '',
          country: {
            identificationCode: 'TR',
            name: 'Türkiye'
          }
        },
        partyTaxScheme: {
          taxScheme: {
            name: dealer.taxOffice || ''
          }
        },
        contact: {
          telephone: dealer.contactPhone || '',
          electronicMail: dealer.contactEmail || dealer.email
        }
      }
    },

    // Fatura kalemleri
    invoiceLines: [invoiceLine],

    // Vergi toplamı
    taxTotal: {
      taxAmount,
      taxSubtotal: [{
        taxableAmount: lineExtensionAmount,
        taxAmount,
        percent: taxRate,
        taxCategory: {
          taxScheme: {
            name: 'KDV',
            taxTypeCode: '0015'
          }
        }
      }]
    },

    // Parasal toplamlar
    legalMonetaryTotal: {
      lineExtensionAmount,
      taxExclusiveAmount: lineExtensionAmount,
      taxInclusiveAmount: totalAmount,
      allowanceTotalAmount: discount,
      payableAmount
    },

    // İlişkili kayıtlar
    dealer: dealer._id,
    payment: payment._id,
    subscription: payment.subscription,

    // E-Arşiv bilgileri
    eArchive: {
      sendType: 'ELEKTRONIK',
      internetSales: {
        websiteUrl: process.env.FRONTEND_URL || 'https://personelplus.com',
        paymentType: 'KREDIKARTI',
        paymentDate: payment.createdAt
      }
    },

    // Notlar
    notes: [
      'Bu fatura e-Arşiv Fatura olarak düzenlenmiştir.',
      `Ödeme No: ${payment._id}`
    ]
  });

  await invoice.save();

  // Payment kaydına invoice referansını ekle
  payment.invoiceNumber = invoice.invoiceNumber;
  payment.invoiceUrl = `/invoices/${invoice._id}`; // PDF URL sonra eklenecek
  await payment.save();

  return invoice;
};

/**
 * Fatura email ile gönder
 * @param {String} invoiceId - Invoice ID
 * @returns {Boolean} Başarı durumu
 */
const sendInvoiceEmail = async (invoiceId) => {
  const invoice = await Invoice.findById(invoiceId)
    .populate('dealer')
    .populate('payment');

  if (!invoice) {
    throw new Error('Fatura bulunamadı');
  }

  const dealer = invoice.dealer;
  const payment = invoice.payment;

  // Email içeriği
  const subject = `PersonelPlus Fatura - ${invoice.invoiceNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">PersonelPlus Faturanız Hazır</h2>

      <p>Sayın ${dealer.name},</p>

      <p>Ödemeniz başarıyla gerçekleştirildi ve faturanız oluşturuldu.</p>

      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Fatura Detayları</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;"><strong>Fatura No:</strong></td>
            <td style="text-align: right;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Tarih:</strong></td>
            <td style="text-align: right;">${new Date(invoice.issueDate).toLocaleDateString('tr-TR')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Tutar (KDV Hariç):</strong></td>
            <td style="text-align: right;">${invoice.legalMonetaryTotal.lineExtensionAmount.toFixed(2)} TL</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>KDV:</strong></td>
            <td style="text-align: right;">${invoice.taxTotal.taxAmount.toFixed(2)} TL</td>
          </tr>
          ${invoice.legalMonetaryTotal.allowanceTotalAmount > 0 ? `
          <tr>
            <td style="padding: 8px 0;"><strong>İndirim:</strong></td>
            <td style="text-align: right; color: #10b981;">-${invoice.legalMonetaryTotal.allowanceTotalAmount.toFixed(2)} TL</td>
          </tr>
          ` : ''}
          <tr style="border-top: 2px solid #2563eb;">
            <td style="padding: 8px 0;"><strong>Ödenecek Tutar:</strong></td>
            <td style="text-align: right; font-size: 18px; color: #2563eb;"><strong>${invoice.legalMonetaryTotal.payableAmount.toFixed(2)} TL</strong></td>
          </tr>
        </table>
      </div>

      <p style="color: #059669; margin: 20px 0;">
        <strong>✓ Ödeme Durumu:</strong> Tamamlandı
      </p>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Faturanıza sistem üzerinden <a href="${process.env.FRONTEND_URL || 'https://personelplus.com'}/payment-history" style="color: #2563eb;">Ödeme Geçmişi</a> sayfasından ulaşabilirsiniz.
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="color: #6b7280; font-size: 12px;">
        Bu e-posta otomatik olarak gönderilmiştir. Sorularınız için <a href="mailto:destek@personelplus.com" style="color: #2563eb;">destek@personelplus.com</a> adresinden bizimle iletişime geçebilirsiniz.
      </p>
    </div>
  `;

  // Email gönder
  await emailService.sendEmail({
    to: dealer.contactEmail || dealer.email,
    subject,
    html
  });

  return true;
};

/**
 * Bayi için faturaları listele
 * @param {String} dealerId - Bayi ID
 * @param {Object} options - Filtreleme seçenekleri
 * @returns {Array} Faturalar
 */
const getInvoicesByDealer = async (dealerId, options = {}) => {
  const { page = 1, limit = 20, startDate, endDate } = options;

  let query = { dealer: dealerId };

  if (startDate || endDate) {
    query.issueDate = {};
    if (startDate) query.issueDate.$gte = new Date(startDate);
    if (endDate) query.issueDate.$lte = new Date(endDate);
  }

  const invoices = await Invoice.find(query)
    .populate('payment', 'amount billingPeriod status createdAt')
    .sort({ issueDate: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Invoice.countDocuments(query);

  return {
    invoices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  generateInvoice,
  sendInvoiceEmail,
  getInvoicesByDealer
};
