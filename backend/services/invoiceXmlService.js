/**
 * e-Fatura UBL-TR XML Oluşturma Servisi
 * GİB e-Fatura Portal Entegratörleri ile Uyumlu
 */

const { v4: uuidv4 } = require('uuid');

// UBL-TR Namespace tanımlamaları
const UBL_NAMESPACES = {
  'xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  'xmlns:xades': 'http://uri.etsi.org/01903/v1.3.2#',
  'xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#'
};

/**
 * XML karakter escape
 */
function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Tarih formatla (YYYY-MM-DD)
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Saat formatla (HH:mm:ss)
 */
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toTimeString().split(' ')[0];
}

/**
 * Tutar formatla (2 ondalık)
 */
function formatAmount(amount) {
  return Number(amount || 0).toFixed(2);
}

/**
 * UBL-TR Invoice XML oluştur
 */
function generateInvoiceXml(invoice) {
  const supplier = invoice.accountingSupplierParty?.party || {};
  const customer = invoice.accountingCustomerParty?.party || {};
  const monetary = invoice.legalMonetaryTotal || {};
  const currency = invoice.documentCurrencyCode || 'TRY';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice ${Object.entries(UBL_NAMESPACES).map(([k, v]) => `${k}="${v}"`).join(' ')}>
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- İmza alanı - Entegratör tarafından doldurulacak -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>

  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${escapeXml(invoice.profileId || 'TICARIFATURA')}</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${escapeXml(invoice.uuid)}</cbc:UUID>
  <cbc:IssueDate>${formatDate(invoice.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${invoice.issueTime || formatTime(invoice.issueDate)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${escapeXml(invoice.invoiceTypeCode || 'SATIS')}</cbc:InvoiceTypeCode>`;

  // Notlar
  if (invoice.notes && invoice.notes.length > 0) {
    invoice.notes.forEach(note => {
      xml += `
  <cbc:Note>${escapeXml(note)}</cbc:Note>`;
    });
  }

  xml += `
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${invoice.invoiceLines?.length || 0}</cbc:LineCountNumeric>`;

  // İade faturası referansı
  if (invoice.billingReference?.invoiceDocumentReference?.id) {
    xml += `
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${escapeXml(invoice.billingReference.invoiceDocumentReference.id)}</cbc:ID>
      <cbc:IssueDate>${formatDate(invoice.billingReference.invoiceDocumentReference.issueDate)}</cbc:IssueDate>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>`;
  }

  // Sipariş referansı
  if (invoice.orderReference?.id) {
    xml += `
  <cac:OrderReference>
    <cbc:ID>${escapeXml(invoice.orderReference.id)}</cbc:ID>
    ${invoice.orderReference.issueDate ? `<cbc:IssueDate>${formatDate(invoice.orderReference.issueDate)}</cbc:IssueDate>` : ''}
  </cac:OrderReference>`;
  }

  // İmza bilgileri placeholder
  xml += `
  <cac:Signature>
    <cbc:ID schemeID="VKN_TCKN">${escapeXml(supplier.partyIdentification?.id)}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${supplier.partyIdentification?.schemeId || 'VKN'}">${escapeXml(supplier.partyIdentification?.id)}</cbc:ID>
      </cac:PartyIdentification>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#Signature</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>`;

  // Satıcı (Tedarikçi) Bilgileri
  xml += generatePartyXml('AccountingSupplierParty', supplier);

  // Alıcı (Müşteri) Bilgileri
  xml += generatePartyXml('AccountingCustomerParty', customer);

  // E-Arşiv için ek bilgiler
  if (invoice.isEArchive && invoice.eArchive?.internetSales) {
    const inet = invoice.eArchive.internetSales;
    xml += `
  <cac:Delivery>
    <cac:Shipment>
      <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
      ${inet.websiteUrl ? `
      <cac:ShipmentStage>
        <cbc:Instructions>${escapeXml(inet.websiteUrl)}</cbc:Instructions>
      </cac:ShipmentStage>` : ''}
    </cac:Shipment>
  </cac:Delivery>`;

    if (inet.paymentType) {
      xml += `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${escapeXml(inet.paymentType)}</cbc:PaymentMeansCode>
    ${inet.paymentDate ? `<cbc:PaymentDueDate>${formatDate(inet.paymentDate)}</cbc:PaymentDueDate>` : ''}
  </cac:PaymentMeans>`;
    }
  }

  // Vergi Toplamı
  xml += generateTaxTotalXml(invoice.taxTotal, currency);

  // Parasal Toplamlar
  xml += `
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${formatAmount(monetary.lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${formatAmount(monetary.taxExclusiveAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${formatAmount(monetary.taxInclusiveAmount)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${currency}">${formatAmount(monetary.allowanceTotalAmount)}</cbc:AllowanceTotalAmount>
    <cbc:ChargeTotalAmount currencyID="${currency}">${formatAmount(monetary.chargeTotalAmount)}</cbc:ChargeTotalAmount>
    <cbc:PayableAmount currencyID="${currency}">${formatAmount(monetary.payableAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>`;

  // Fatura Kalemleri
  if (invoice.invoiceLines && invoice.invoiceLines.length > 0) {
    invoice.invoiceLines.forEach((line, index) => {
      xml += generateInvoiceLineXml(line, index + 1, currency);
    });
  }

  xml += `
</Invoice>`;

  return xml;
}

/**
 * Taraf (Party) XML oluştur
 */
function generatePartyXml(tagName, party) {
  const address = party.postalAddress || {};
  const country = address.country || {};
  const taxScheme = party.partyTaxScheme?.taxScheme || {};

  return `
  <cac:${tagName}>
    <cac:Party>
      <cbc:WebsiteURI></cbc:WebsiteURI>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${party.partyIdentification?.schemeId || 'VKN'}">${escapeXml(party.partyIdentification?.id)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(party.partyName)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:ID></cbc:ID>
        <cbc:StreetName>${escapeXml(address.streetName || '')}</cbc:StreetName>
        <cbc:BuildingNumber>${escapeXml(address.buildingNumber || '')}</cbc:BuildingNumber>
        <cbc:CitySubdivisionName>${escapeXml(address.citySubdivisionName || '')}</cbc:CitySubdivisionName>
        <cbc:CityName>${escapeXml(address.cityName || '')}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(address.postalZone || '')}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${escapeXml(country.identificationCode || 'TR')}</cbc:IdentificationCode>
          <cbc:Name>${escapeXml(country.name || 'Türkiye')}</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme>
          <cbc:Name>${escapeXml(taxScheme.name || '')}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(party.contact?.telephone || '')}</cbc:Telephone>
        <cbc:ElectronicMail>${escapeXml(party.contact?.electronicMail || '')}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:${tagName}>`;
}

/**
 * Vergi Toplamı XML oluştur
 */
function generateTaxTotalXml(taxTotal, currency) {
  if (!taxTotal) {
    taxTotal = { taxAmount: 0, taxSubtotal: [] };
  }

  let xml = `
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${formatAmount(taxTotal.taxAmount)}</cbc:TaxAmount>`;

  if (taxTotal.taxSubtotal && taxTotal.taxSubtotal.length > 0) {
    taxTotal.taxSubtotal.forEach(subtotal => {
      xml += `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${formatAmount(subtotal.taxableAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${formatAmount(subtotal.taxAmount)}</cbc:TaxAmount>
      <cbc:Percent>${subtotal.percent || 0}</cbc:Percent>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:Name>${escapeXml(subtotal.taxCategory?.taxScheme?.name || 'KDV')}</cbc:Name>
          <cbc:TaxTypeCode>${escapeXml(subtotal.taxCategory?.taxScheme?.taxTypeCode || '0015')}</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
    });
  } else {
    // Default KDV subtotal
    xml += `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">0.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">0.00</cbc:TaxAmount>
      <cbc:Percent>0</cbc:Percent>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:Name>KDV</cbc:Name>
          <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`;
  }

  xml += `
  </cac:TaxTotal>`;

  return xml;
}

/**
 * Fatura Kalemi XML oluştur
 */
function generateInvoiceLineXml(line, lineNumber, currency) {
  const item = line.item || {};
  const quantity = line.quantity || { value: 1, unitCode: 'C62' };
  const price = line.price || { priceAmount: 0 };

  let xml = `
  <cac:InvoiceLine>
    <cbc:ID>${line.lineId || lineNumber}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${quantity.unitCode || 'C62'}">${quantity.value || 1}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${formatAmount(line.lineExtensionAmount)}</cbc:LineExtensionAmount>`;

  // İndirim/Artırım
  if (line.allowanceCharge && line.allowanceCharge.length > 0) {
    line.allowanceCharge.forEach(ac => {
      xml += `
    <cac:AllowanceCharge>
      <cbc:ChargeIndicator>${ac.chargeIndicator ? 'true' : 'false'}</cbc:ChargeIndicator>
      ${ac.multiplierFactorNumeric ? `<cbc:MultiplierFactorNumeric>${ac.multiplierFactorNumeric}</cbc:MultiplierFactorNumeric>` : ''}
      <cbc:Amount currencyID="${currency}">${formatAmount(ac.amount)}</cbc:Amount>
      <cbc:BaseAmount currencyID="${currency}">${formatAmount(ac.baseAmount)}</cbc:BaseAmount>
      ${ac.reason ? `<cbc:AllowanceChargeReason>${escapeXml(ac.reason)}</cbc:AllowanceChargeReason>` : ''}
    </cac:AllowanceCharge>`;
    });
  }

  // Kalem Vergi Toplamı
  if (line.taxTotal) {
    xml += `
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${currency}">${formatAmount(line.taxTotal.taxAmount)}</cbc:TaxAmount>`;

    if (line.taxTotal.taxSubtotal && line.taxTotal.taxSubtotal.length > 0) {
      line.taxTotal.taxSubtotal.forEach(subtotal => {
        xml += `
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${currency}">${formatAmount(subtotal.taxableAmount)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${currency}">${formatAmount(subtotal.taxAmount)}</cbc:TaxAmount>
        <cbc:Percent>${subtotal.percent || 0}</cbc:Percent>
        <cac:TaxCategory>
          <cac:TaxScheme>
            <cbc:Name>${escapeXml(subtotal.taxCategory?.taxScheme?.name || 'KDV')}</cbc:Name>
            <cbc:TaxTypeCode>${escapeXml(subtotal.taxCategory?.taxScheme?.taxTypeCode || '0015')}</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>`;
      });
    }

    xml += `
    </cac:TaxTotal>`;
  }

  // Ürün/Hizmet Bilgisi
  xml += `
    <cac:Item>
      <cbc:Description>${escapeXml(item.description || item.name || '')}</cbc:Description>
      <cbc:Name>${escapeXml(item.name || '')}</cbc:Name>`;

  if (item.sellersItemIdentification) {
    xml += `
      <cac:SellersItemIdentification>
        <cbc:ID>${escapeXml(item.sellersItemIdentification)}</cbc:ID>
      </cac:SellersItemIdentification>`;
  }

  if (item.buyersItemIdentification) {
    xml += `
      <cac:BuyersItemIdentification>
        <cbc:ID>${escapeXml(item.buyersItemIdentification)}</cbc:ID>
      </cac:BuyersItemIdentification>`;
  }

  xml += `
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${formatAmount(price.priceAmount)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;

  return xml;
}

/**
 * Fatura oluştur (veritabanı kaydı + XML)
 */
async function createInvoice(invoiceData) {
  const Invoice = require('../models/Invoice');

  // UUID oluştur
  if (!invoiceData.uuid) {
    invoiceData.uuid = uuidv4();
  }

  // Fatura kaydı oluştur
  const invoice = new Invoice(invoiceData);
  await invoice.save();

  // XML oluştur
  const xmlContent = generateInvoiceXml(invoice.toObject());
  invoice.xmlContent = xmlContent;
  invoice.xmlHash = require('crypto').createHash('sha256').update(xmlContent).digest('hex');

  await invoice.save();

  return invoice;
}

/**
 * Ödeme bilgilerinden fatura oluştur
 */
async function createInvoiceFromPayment(payment, dealer, packageInfo) {
  const Invoice = require('../models/Invoice');
  const Dealer = require('../models/Dealer');

  // Bayi bilgilerini al
  const dealerInfo = await Dealer.findById(dealer._id || dealer);
  if (!dealerInfo) {
    throw new Error('Bayi bulunamadı');
  }

  // Sistem bilgileri (tedarikçi/satıcı)
  const systemSettings = {
    companyName: 'Personel Yönetim Sistemi A.Ş.',
    taxNumber: '1234567890',
    taxOffice: 'Kadıköy Vergi Dairesi',
    address: {
      streetName: 'Teknoloji Caddesi No:1',
      citySubdivisionName: 'Kadıköy',
      cityName: 'İstanbul',
      postalZone: '34000'
    },
    phone: '+90 212 555 0000',
    email: 'fatura@pys.com.tr'
  };

  // KDV hesaplama
  const taxRate = 20; // %20 KDV
  const taxExclusiveAmount = payment.amount / (1 + taxRate / 100);
  const taxAmount = payment.amount - taxExclusiveAmount;

  // Fatura kalemi
  const invoiceLine = {
    lineId: '1',
    item: {
      name: `${packageInfo.name} - ${payment.billingType === 'yearly' ? 'Yıllık' : 'Aylık'} Abonelik`,
      description: `${packageInfo.name} paketi abonelik ücreti`
    },
    quantity: {
      value: 1,
      unitCode: 'C62' // Adet
    },
    price: {
      priceAmount: taxExclusiveAmount,
      currencyId: 'TRY'
    },
    lineExtensionAmount: taxExclusiveAmount,
    taxTotal: {
      taxAmount: taxAmount,
      taxSubtotal: [{
        taxableAmount: taxExclusiveAmount,
        taxAmount: taxAmount,
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

  // Fatura verisi
  const invoiceData = {
    invoiceTypeCode: 'SATIS',
    profileId: dealerInfo.taxNumber ? 'TICARIFATURA' : 'EARSIVFATURA',
    issueDate: new Date(),
    documentCurrencyCode: 'TRY',

    // Satıcı (Sistem)
    accountingSupplierParty: {
      party: {
        partyIdentification: {
          schemeId: 'VKN',
          id: systemSettings.taxNumber
        },
        partyName: systemSettings.companyName,
        postalAddress: {
          streetName: systemSettings.address.streetName,
          citySubdivisionName: systemSettings.address.citySubdivisionName,
          cityName: systemSettings.address.cityName,
          postalZone: systemSettings.address.postalZone,
          country: {
            identificationCode: 'TR',
            name: 'Türkiye'
          }
        },
        partyTaxScheme: {
          taxScheme: {
            name: systemSettings.taxOffice
          }
        },
        contact: {
          telephone: systemSettings.phone,
          electronicMail: systemSettings.email
        }
      }
    },

    // Alıcı (Bayi)
    accountingCustomerParty: {
      party: {
        partyIdentification: {
          schemeId: dealerInfo.taxNumber?.length === 11 ? 'TCKN' : 'VKN',
          id: dealerInfo.taxNumber || dealerInfo.identityNumber || ''
        },
        partyName: dealerInfo.name,
        postalAddress: {
          streetName: dealerInfo.address || '',
          citySubdivisionName: dealerInfo.district || '',
          cityName: dealerInfo.city || '',
          postalZone: dealerInfo.postalCode || '',
          country: {
            identificationCode: 'TR',
            name: 'Türkiye'
          }
        },
        partyTaxScheme: {
          taxScheme: {
            name: dealerInfo.taxOffice || ''
          }
        },
        contact: {
          telephone: dealerInfo.phone || '',
          electronicMail: dealerInfo.contactEmail || ''
        }
      }
    },

    // Fatura kalemleri
    invoiceLines: [invoiceLine],

    // Vergi toplamı
    taxTotal: {
      taxAmount: taxAmount,
      taxSubtotal: [{
        taxableAmount: taxExclusiveAmount,
        taxAmount: taxAmount,
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
      lineExtensionAmount: taxExclusiveAmount,
      taxExclusiveAmount: taxExclusiveAmount,
      taxInclusiveAmount: payment.amount,
      allowanceTotalAmount: 0,
      chargeTotalAmount: 0,
      payableAmount: payment.amount
    },

    // İlişkili kayıtlar
    dealer: dealerInfo._id,
    payment: payment._id,

    // E-Arşiv ayarları
    isEArchive: !dealerInfo.taxNumber,
    eArchive: {
      sendType: 'ELEKTRONIK',
      internetSales: {
        paymentType: 'KREDIKARTI',
        paymentDate: new Date()
      }
    },

    // Notlar
    notes: [
      `Ödeme Referansı: ${payment.iyzicoPaymentId || payment._id}`,
      `Paket: ${packageInfo.name}`
    ]
  };

  // Fatura oluştur
  return await createInvoice(invoiceData);
}

/**
 * XML'i yeniden oluştur
 */
async function regenerateXml(invoiceId) {
  const Invoice = require('../models/Invoice');

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new Error('Fatura bulunamadı');
  }

  const xmlContent = generateInvoiceXml(invoice.toObject());
  invoice.xmlContent = xmlContent;
  invoice.xmlHash = require('crypto').createHash('sha256').update(xmlContent).digest('hex');

  await invoice.save();

  return invoice;
}

/**
 * Fatura XML doğrulama (basit)
 */
function validateInvoiceXml(xml) {
  const errors = [];

  // Temel yapı kontrolü
  if (!xml.includes('<Invoice')) {
    errors.push('Invoice root element bulunamadı');
  }

  if (!xml.includes('<cbc:ID>')) {
    errors.push('Fatura numarası (ID) bulunamadı');
  }

  if (!xml.includes('<cbc:UUID>')) {
    errors.push('UUID bulunamadı');
  }

  if (!xml.includes('<cac:AccountingSupplierParty>')) {
    errors.push('Satıcı bilgileri bulunamadı');
  }

  if (!xml.includes('<cac:AccountingCustomerParty>')) {
    errors.push('Alıcı bilgileri bulunamadı');
  }

  if (!xml.includes('<cac:LegalMonetaryTotal>')) {
    errors.push('Parasal toplamlar bulunamadı');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  generateInvoiceXml,
  createInvoice,
  createInvoiceFromPayment,
  regenerateXml,
  validateInvoiceXml,
  escapeXml,
  formatDate,
  formatTime,
  formatAmount
};
