/**
 * Foriba e-Fatura Entegratör Adapter
 * https://www.foriba.com/
 *
 * NOT: Bu gerçek API entegrasyonudur. Kullanmadan önce
 * Foriba ile anlaşma yapılması ve API credentials alınması gerekir.
 */

const BaseIntegrator = require('./baseIntegrator');
const axios = require('axios');

class ForibaIntegrator extends BaseIntegrator {
  constructor(config = {}) {
    super(config);
    this.name = 'foriba';

    // API endpoints
    this.baseUrl = config.testMode
      ? 'https://econnecttest.foriba.com'
      : 'https://econnect.foriba.com';

    // Kimlik bilgileri
    this.username = config.username;
    this.password = config.password;
    this.serviceId = config.serviceId;

    // Token
    this.token = null;
    this.tokenExpiry = null;

    this.validateConfig();
  }

  validateConfig() {
    this.isConfigured = !!(this.username && this.password && this.serviceId);
    return this.isConfigured;
  }

  /**
   * Token al veya yenile
   */
  async getToken() {
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/api/Authentication`, {
        username: this.username,
        password: this.password,
        serviceId: this.serviceId
      });

      if (response.data.Token) {
        this.token = response.data.Token;
        // Token 1 saat geçerli, 55 dk'da yenile
        this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);
        return this.token;
      }

      throw new Error('Token alınamadı');
    } catch (error) {
      this.log('error', 'Token alma hatası', error.message);
      throw error;
    }
  }

  /**
   * API isteği gönder
   */
  async apiRequest(endpoint, method, data = null) {
    const token = await this.getToken();

    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      this.log('error', `API hatası: ${endpoint}`, error.response?.data || error.message);
      throw error;
    }
  }

  async sendInvoice(invoice, xml) {
    if (!this.isConfigured) {
      return this.errorResponse('Foriba entegrasyonu yapılandırılmamış');
    }

    try {
      const base64Xml = Buffer.from(xml, 'utf-8').toString('base64');

      const response = await this.apiRequest('/api/Invoice/Send', 'POST', {
        uuid: invoice.uuid,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceTypeCode,
        profileId: invoice.profileId,
        content: base64Xml
      });

      if (response.Success) {
        return this.successResponse({
          ettn: response.ETTN || invoice.uuid,
          envelopeId: response.EnvelopeIdentifier
        }, 'Fatura başarıyla gönderildi');
      }

      return this.errorResponse(response.Message || 'Fatura gönderilemedi', response);
    } catch (error) {
      return this.errorResponse(`Fatura gönderim hatası: ${error.message}`);
    }
  }

  async sendEArchiveInvoice(invoice, xml) {
    if (!this.isConfigured) {
      return this.errorResponse('Foriba entegrasyonu yapılandırılmamış');
    }

    try {
      const base64Xml = Buffer.from(xml, 'utf-8').toString('base64');

      const response = await this.apiRequest('/api/EArchive/Send', 'POST', {
        uuid: invoice.uuid,
        invoiceNumber: invoice.invoiceNumber,
        sendType: invoice.eArchive?.sendType || 'ELEKTRONIK',
        content: base64Xml
      });

      if (response.Success) {
        return this.successResponse({
          ettn: response.ETTN || invoice.uuid
        }, 'e-Arşiv fatura başarıyla gönderildi');
      }

      return this.errorResponse(response.Message || 'e-Arşiv fatura gönderilemedi', response);
    } catch (error) {
      return this.errorResponse(`e-Arşiv fatura gönderim hatası: ${error.message}`);
    }
  }

  async getInvoiceStatus(uuid) {
    if (!this.isConfigured) {
      return this.errorResponse('Foriba entegrasyonu yapılandırılmamış');
    }

    try {
      const response = await this.apiRequest(`/api/Invoice/Status/${uuid}`, 'GET');

      return this.successResponse({
        status: response.Status,
        statusCode: response.StatusCode,
        statusDescription: response.StatusDescription,
        responseDate: response.ResponseDate
      });
    } catch (error) {
      return this.errorResponse(`Durum sorgulama hatası: ${error.message}`);
    }
  }

  async cancelInvoice(uuid, reason) {
    if (!this.isConfigured) {
      return this.errorResponse('Foriba entegrasyonu yapılandırılmamış');
    }

    try {
      const response = await this.apiRequest('/api/Invoice/Cancel', 'POST', {
        uuid,
        reason
      });

      if (response.Success) {
        return this.successResponse({}, 'Fatura iptal edildi');
      }

      return this.errorResponse(response.Message || 'Fatura iptal edilemedi', response);
    } catch (error) {
      return this.errorResponse(`İptal hatası: ${error.message}`);
    }
  }

  async getIncomingInvoices(startDate, endDate) {
    if (!this.isConfigured) {
      return this.errorResponse('Foriba entegrasyonu yapılandırılmamış');
    }

    try {
      const response = await this.apiRequest('/api/Invoice/Incoming', 'POST', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      return this.successResponse({
        invoices: response.Invoices || []
      });
    } catch (error) {
      return this.errorResponse(`Gelen faturalar hatası: ${error.message}`);
    }
  }

  async checkTaxpayer(taxNumber) {
    if (!this.isConfigured) {
      return this.errorResponse('Foriba entegrasyonu yapılandırılmamış');
    }

    try {
      const response = await this.apiRequest(`/api/Taxpayer/Check/${taxNumber}`, 'GET');

      return this.successResponse({
        isRegistered: response.IsRegistered,
        alias: response.Alias,
        registerDate: response.RegisterDate,
        title: response.Title
      });
    } catch (error) {
      return this.errorResponse(`Mükellef sorgulama hatası: ${error.message}`);
    }
  }

  async testConnection() {
    if (!this.isConfigured) {
      return this.errorResponse('Foriba entegrasyonu yapılandırılmamış');
    }

    const startTime = Date.now();

    try {
      await this.getToken();
      const latency = Date.now() - startTime;

      return this.successResponse({
        latency
      }, 'Bağlantı başarılı');
    } catch (error) {
      return this.errorResponse(`Bağlantı hatası: ${error.message}`);
    }
  }

  async downloadPdf(uuid) {
    if (!this.isConfigured) {
      throw new Error('Foriba entegrasyonu yapılandırılmamış');
    }

    try {
      const token = await this.getToken();
      const response = await axios.get(`${this.baseUrl}/api/Invoice/Pdf/${uuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'arraybuffer'
      });

      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`PDF indirme hatası: ${error.message}`);
    }
  }

  async downloadXml(uuid) {
    if (!this.isConfigured) {
      throw new Error('Foriba entegrasyonu yapılandırılmamış');
    }

    try {
      const response = await this.apiRequest(`/api/Invoice/Xml/${uuid}`, 'GET');
      return Buffer.from(response.Content, 'base64').toString('utf-8');
    } catch (error) {
      throw new Error(`XML indirme hatası: ${error.message}`);
    }
  }
}

module.exports = ForibaIntegrator;
