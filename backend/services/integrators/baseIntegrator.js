/**
 * e-Fatura Entegratör Temel Sınıfı (Abstract)
 * Tüm entegratörler bu sınıfı extends etmeli
 */

class BaseIntegrator {
  constructor(config = {}) {
    if (this.constructor === BaseIntegrator) {
      throw new Error('BaseIntegrator abstract sınıfı doğrudan kullanılamaz');
    }

    this.name = 'base';
    this.config = config;
    this.isConfigured = false;
  }

  /**
   * Entegratör yapılandırmasını doğrula
   * @returns {boolean}
   */
  validateConfig() {
    throw new Error('validateConfig() metodu implemente edilmeli');
  }

  /**
   * e-Fatura gönder
   * @param {Object} invoice - Invoice model instance
   * @param {string} xml - UBL-TR XML içeriği
   * @returns {Promise<Object>} { success, ettn, message, rawResponse }
   */
  async sendInvoice(invoice, xml) {
    throw new Error('sendInvoice() metodu implemente edilmeli');
  }

  /**
   * e-Arşiv fatura gönder
   * @param {Object} invoice - Invoice model instance
   * @param {string} xml - UBL-TR XML içeriği
   * @returns {Promise<Object>} { success, ettn, message, rawResponse }
   */
  async sendEArchiveInvoice(invoice, xml) {
    throw new Error('sendEArchiveInvoice() metodu implemente edilmeli');
  }

  /**
   * Fatura durumu sorgula
   * @param {string} uuid - Fatura UUID
   * @returns {Promise<Object>} { status, statusDescription, rawResponse }
   */
  async getInvoiceStatus(uuid) {
    throw new Error('getInvoiceStatus() metodu implemente edilmeli');
  }

  /**
   * Fatura iptal et
   * @param {string} uuid - Fatura UUID
   * @param {string} reason - İptal nedeni
   * @returns {Promise<Object>} { success, message, rawResponse }
   */
  async cancelInvoice(uuid, reason) {
    throw new Error('cancelInvoice() metodu implemente edilmeli');
  }

  /**
   * Gelen faturaları listele
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Array>}
   */
  async getIncomingInvoices(startDate, endDate) {
    throw new Error('getIncomingInvoices() metodu implemente edilmeli');
  }

  /**
   * Mükellef GİB'de e-fatura mükellefi mi kontrol et
   * @param {string} taxNumber - VKN veya TCKN
   * @returns {Promise<Object>} { isRegistered, alias, registerDate }
   */
  async checkTaxpayer(taxNumber) {
    throw new Error('checkTaxpayer() metodu implemente edilmeli');
  }

  /**
   * Entegratör bağlantı testi
   * @returns {Promise<Object>} { success, message, latency }
   */
  async testConnection() {
    throw new Error('testConnection() metodu implemente edilmeli');
  }

  /**
   * Fatura PDF'ini indir
   * @param {string} uuid - Fatura UUID
   * @returns {Promise<Buffer>} PDF içeriği
   */
  async downloadPdf(uuid) {
    throw new Error('downloadPdf() metodu implemente edilmeli');
  }

  /**
   * Fatura XML'ini indir
   * @param {string} uuid - Fatura UUID
   * @returns {Promise<string>} XML içeriği
   */
  async downloadXml(uuid) {
    throw new Error('downloadXml() metodu implemente edilmeli');
  }

  /**
   * Hata yanıtı oluştur
   */
  errorResponse(message, rawResponse = null) {
    return {
      success: false,
      message,
      rawResponse
    };
  }

  /**
   * Başarılı yanıt oluştur
   */
  successResponse(data, message = 'İşlem başarılı') {
    return {
      success: true,
      message,
      ...data
    };
  }

  /**
   * Log yaz
   */
  log(level, message, data = null) {
    const logEntry = {
      integrator: this.name,
      level,
      message,
      timestamp: new Date().toISOString()
    };

    if (data) {
      logEntry.data = data;
    }

    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
}

module.exports = BaseIntegrator;
