/**
 * Mock e-Fatura Entegratör
 * Test ve geliştirme ortamları için simülasyon
 */

const BaseIntegrator = require('./baseIntegrator');
const { v4: uuidv4 } = require('uuid');

class MockIntegrator extends BaseIntegrator {
  constructor(config = {}) {
    super(config);
    this.name = 'mock';
    this.isConfigured = true;

    // Simülasyon ayarları
    this.simulateDelay = config.simulateDelay || 500; // ms
    this.simulateErrors = config.simulateErrors || false;
    this.errorRate = config.errorRate || 0.1; // %10 hata oranı

    // Bellek içi fatura deposu (test için)
    this.invoiceStore = new Map();
  }

  validateConfig() {
    return true;
  }

  /**
   * Gecikme simülasyonu
   */
  async delay() {
    await new Promise(resolve => setTimeout(resolve, this.simulateDelay));
  }

  /**
   * Rastgele hata simülasyonu
   */
  shouldSimulateError() {
    return this.simulateErrors && Math.random() < this.errorRate;
  }

  async sendInvoice(invoice, xml) {
    await this.delay();

    if (this.shouldSimulateError()) {
      return this.errorResponse('Simüle edilmiş hata: GİB sunucusuna bağlanılamadı');
    }

    const ettn = uuidv4();

    // Bellek deposuna kaydet
    this.invoiceStore.set(invoice.uuid, {
      uuid: invoice.uuid,
      invoiceNumber: invoice.invoiceNumber,
      ettn,
      status: 'sent',
      sentAt: new Date(),
      xml
    });

    this.log('info', 'Mock fatura gönderildi', { uuid: invoice.uuid, ettn });

    return this.successResponse({
      ettn,
      envelopeId: `ENV-${Date.now()}`
    }, 'Fatura başarıyla gönderildi (Mock)');
  }

  async sendEArchiveInvoice(invoice, xml) {
    await this.delay();

    if (this.shouldSimulateError()) {
      return this.errorResponse('Simüle edilmiş hata: e-Arşiv servisi yanıt vermiyor');
    }

    const ettn = uuidv4();

    this.invoiceStore.set(invoice.uuid, {
      uuid: invoice.uuid,
      invoiceNumber: invoice.invoiceNumber,
      ettn,
      status: 'sent',
      isEArchive: true,
      sentAt: new Date(),
      xml
    });

    this.log('info', 'Mock e-Arşiv fatura gönderildi', { uuid: invoice.uuid, ettn });

    return this.successResponse({
      ettn
    }, 'e-Arşiv fatura başarıyla gönderildi (Mock)');
  }

  async getInvoiceStatus(uuid) {
    await this.delay();

    const stored = this.invoiceStore.get(uuid);

    if (!stored) {
      return this.errorResponse('Fatura bulunamadı');
    }

    // Rastgele durum geçişi simülasyonu
    const statuses = ['sent', 'accepted', 'accepted', 'accepted']; // Kabul olasılığı yüksek
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    // Durumu güncelle
    stored.status = randomStatus;
    this.invoiceStore.set(uuid, stored);

    return this.successResponse({
      status: randomStatus,
      statusCode: randomStatus === 'accepted' ? '1000' : '2000',
      statusDescription: randomStatus === 'accepted'
        ? 'Fatura kabul edildi'
        : 'Fatura işleniyor',
      responseDate: new Date()
    });
  }

  async cancelInvoice(uuid, reason) {
    await this.delay();

    const stored = this.invoiceStore.get(uuid);

    if (!stored) {
      return this.errorResponse('Fatura bulunamadı');
    }

    if (stored.status === 'cancelled') {
      return this.errorResponse('Fatura zaten iptal edilmiş');
    }

    stored.status = 'cancelled';
    stored.cancelledAt = new Date();
    stored.cancellationReason = reason;
    this.invoiceStore.set(uuid, stored);

    this.log('info', 'Mock fatura iptal edildi', { uuid, reason });

    return this.successResponse({}, 'Fatura iptal edildi (Mock)');
  }

  async getIncomingInvoices(startDate, endDate) {
    await this.delay();

    // Mock gelen faturalar
    const mockInvoices = [
      {
        uuid: uuidv4(),
        invoiceNumber: 'ABC2024000000001',
        supplierName: 'Test Tedarikçi A.Ş.',
        supplierTaxNumber: '1234567890',
        amount: 1500.00,
        taxAmount: 300.00,
        issueDate: new Date()
      },
      {
        uuid: uuidv4(),
        invoiceNumber: 'XYZ2024000000002',
        supplierName: 'Örnek Firma Ltd.',
        supplierTaxNumber: '9876543210',
        amount: 2500.00,
        taxAmount: 500.00,
        issueDate: new Date()
      }
    ];

    return this.successResponse({
      invoices: mockInvoices
    });
  }

  async checkTaxpayer(taxNumber) {
    await this.delay();

    // Tüm VKN'ler için kayıtlı döndür (test amaçlı)
    const isRegistered = taxNumber.length === 10 || taxNumber.length === 11;

    return this.successResponse({
      isRegistered,
      alias: isRegistered ? `urn:mail:defaultgb@${taxNumber}.com` : null,
      registerDate: isRegistered ? new Date('2020-01-01') : null,
      title: isRegistered ? 'Test Firma' : null
    });
  }

  async testConnection() {
    const startTime = Date.now();
    await this.delay();
    const latency = Date.now() - startTime;

    return this.successResponse({
      latency
    }, 'Mock bağlantı başarılı');
  }

  async downloadPdf(uuid) {
    await this.delay();

    const stored = this.invoiceStore.get(uuid);

    if (!stored) {
      throw new Error('Fatura bulunamadı');
    }

    // Basit mock PDF (gerçek bir PDF değil)
    const mockPdfContent = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 100 700 Td (Mock Fatura: ${stored.invoiceNumber}) Tj ET
endstream
endobj
xref
0 5
trailer
<< /Root 1 0 R /Size 5 >>
startxref
%%EOF
    `;

    return Buffer.from(mockPdfContent, 'utf-8');
  }

  async downloadXml(uuid) {
    await this.delay();

    const stored = this.invoiceStore.get(uuid);

    if (!stored) {
      throw new Error('Fatura bulunamadı');
    }

    return stored.xml || `<?xml version="1.0" encoding="UTF-8"?><Invoice><ID>${stored.invoiceNumber}</ID></Invoice>`;
  }

  /**
   * Test için tüm faturaları temizle
   */
  clearStore() {
    this.invoiceStore.clear();
  }

  /**
   * Test için depolanmış fatura sayısı
   */
  getStoreSize() {
    return this.invoiceStore.size;
  }
}

module.exports = MockIntegrator;
