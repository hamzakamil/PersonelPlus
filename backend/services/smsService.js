/**
 * SMS Servisi - Verimor API Entegrasyonu
 * Dokümantasyon: https://developer.verimor.com.tr/smsapi
 */

const axios = require('axios');
const crypto = require('crypto');
const SmsVerification = require('../models/SmsVerification');
const smsConfig = require('../config/sms');

class SmsService {
  constructor() {
    this.config = smsConfig.verimor;
    this.otpConfig = smsConfig.otp;
    this.templates = smsConfig.templates;
    this.devConfig = smsConfig.development;
  }

  /**
   * Telefon numarasını normalleştir (05XXXXXXXXX formatına)
   */
  normalizePhone(phone) {
    if (!phone) return null;

    // Sadece rakamları al
    let cleaned = phone.replace(/\D/g, '');

    // +90 ile başlıyorsa kaldır
    if (cleaned.startsWith('90') && cleaned.length === 12) {
      cleaned = '0' + cleaned.slice(2);
    }

    // 5 ile başlıyorsa başına 0 ekle
    if (cleaned.startsWith('5') && cleaned.length === 10) {
      cleaned = '0' + cleaned;
    }

    // Geçerli format kontrolü
    if (!/^05\d{9}$/.test(cleaned)) {
      throw new Error('Gecersiz telefon numarasi formati');
    }

    return cleaned;
  }

  /**
   * Rastgele OTP kodu üret
   */
  generateOtpCode() {
    const length = this.otpConfig.length;
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  /**
   * OTP kodunu hash'le (SHA256)
   */
  hashCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Temel SMS gönderimi
   */
  async sendSms(phone, message, customId = null) {
    const normalizedPhone = this.normalizePhone(phone);

    // Mock modda gerçek SMS gönderme
    if (this.devConfig.mockSms) {
      console.log(`[SMS MOCK] To: ${normalizedPhone}, Message: ${message}`);
      return {
        success: true,
        campaignId: `MOCK_${Date.now()}`,
        customId: customId || `mock_${Date.now()}`,
        mock: true,
      };
    }

    // API bilgileri kontrolü
    if (!this.config.username || !this.config.password) {
      throw new Error(
        'Verimor API bilgileri eksik. VERIMOR_USERNAME ve VERIMOR_PASSWORD env degiskenlerini ayarlayin.'
      );
    }

    try {
      const payload = {
        username: this.config.username,
        password: this.config.password,
        source_addr: this.config.sourceAddr,
        datacoding: this.config.datacoding,
        messages: [
          {
            dest: normalizedPhone,
            msg: message,
          },
        ],
      };

      if (customId) {
        payload.messages[0].custom_id = customId;
      }

      const response = await axios.post(`${this.config.apiUrl}/send.json`, payload, {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Verimor başarılı yanıt kontrolü
      if (response.data && (response.data.status === 0 || response.data.campaign_id)) {
        return {
          success: true,
          campaignId: response.data.campaign_id,
          customId: customId,
          messageCount: response.data.message_count || 1,
        };
      }

      throw new Error(response.data?.error_message || 'SMS gonderilemedi');
    } catch (error) {
      console.error('[SMS ERROR]', error.response?.data || error.message);

      // Retry mekanizması
      if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
        // Ağ hatası - retry yapılabilir
        throw new Error('SMS servisi gecici olarak kullanilamiyor. Lutfen tekrar deneyin.');
      }

      throw new Error(error.response?.data?.error_message || error.message || 'SMS gonderilemedi');
    }
  }

  /**
   * OTP SMS gönder ve doğrulama kaydı oluştur
   */
  async sendOtp({ phone, type, relatedModel, relatedId, employee, company, messageBuilder }) {
    const normalizedPhone = this.normalizePhone(phone);

    // Rate limiting kontrolü
    const lastVerification = await SmsVerification.findOne({
      phone: normalizedPhone,
      type,
      relatedModel,
      relatedId,
      createdAt: {
        $gt: new Date(Date.now() - this.otpConfig.rateLimitSeconds * 1000),
      },
    });

    if (lastVerification) {
      const waitSeconds = Math.ceil(
        (this.otpConfig.rateLimitSeconds * 1000 -
          (Date.now() - lastVerification.createdAt.getTime())) /
          1000
      );
      throw new Error(`Yeni kod icin ${waitSeconds} saniye beklemeniz gerekmektedir.`);
    }

    // OTP kodu oluştur
    const code = this.generateOtpCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + this.otpConfig.expiresInMinutes * 60 * 1000);

    // Mesaj içeriğini oluştur
    const message = messageBuilder ? messageBuilder(code) : this.templates.genericOtp(code);

    // Custom ID oluştur (takip için)
    const customId = `${type}_${relatedId}_${Date.now()}`;

    // SMS gönder
    const smsResult = await this.sendSms(normalizedPhone, message, customId);

    // Doğrulama kaydı oluştur
    const verification = await SmsVerification.create({
      type,
      phone: normalizedPhone,
      codeHash,
      codeExpires: expiresAt,
      status: 'PENDING',
      campaignId: smsResult.campaignId,
      customId: smsResult.customId,
      deliveryStatus: smsResult.mock ? 'DELIVERED' : 'SENT',
      sentAt: new Date(),
      messageContent: message,
      relatedModel,
      relatedId,
      employee,
      company,
    });

    return {
      verificationId: verification._id,
      maskedPhone: verification.maskedPhone,
      expiresAt,
      expiresInMinutes: this.otpConfig.expiresInMinutes,
    };
  }

  /**
   * OTP doğrulama
   */
  async verifyOtp(verificationId, code, ip) {
    const verification = await SmsVerification.findById(verificationId);

    if (!verification) {
      throw new Error('Dogrulama kaydi bulunamadi');
    }

    // Durum kontrolü
    if (verification.status === 'VERIFIED') {
      throw new Error('Bu kod zaten dogrulanmis');
    }

    if (verification.status === 'FAILED') {
      throw new Error('Cok fazla hatali deneme. Yeni kod talep edin.');
    }

    if (verification.status === 'EXPIRED' || verification.isExpired) {
      await verification.markAsExpired();
      throw new Error('Dogrulama kodu suresi dolmus. Yeni kod talep edin.');
    }

    // Deneme sayısı kontrolü
    if (verification.attempts >= this.otpConfig.maxAttempts) {
      verification.status = 'FAILED';
      await verification.save();
      throw new Error('Cok fazla hatali deneme. Yeni kod talep edin.');
    }

    // Kod doğrulama
    const inputHash = this.hashCode(code);
    if (inputHash !== verification.codeHash) {
      await verification.incrementAttempts();
      const remaining = verification.remainingAttempts;
      throw new Error(`Hatali kod. ${remaining} deneme hakkiniz kaldi.`);
    }

    // Başarılı doğrulama
    await verification.markAsVerified(ip);

    return {
      success: true,
      verification,
    };
  }

  /**
   * Doğrulama ile birlikte zaman damgası ekle
   */
  async verifyOtpWithTimestamp(verificationId, code, ip, timestampService) {
    const result = await this.verifyOtp(verificationId, code, ip);

    // Zaman damgası al
    if (timestampService && typeof timestampService.createTimestamp === 'function') {
      try {
        // Doğrulama bilgilerini hash'le
        const verificationData = JSON.stringify({
          verificationId: result.verification._id.toString(),
          phone: result.verification.phone,
          type: result.verification.type,
          relatedModel: result.verification.relatedModel,
          relatedId: result.verification.relatedId.toString(),
          verifiedAt: result.verification.verifiedAt.toISOString(),
          verifiedIp: ip,
          messageContent: result.verification.messageContent,
        });

        const timestampResult = await timestampService.createTimestamp(
          Buffer.from(verificationData)
        );

        if (timestampResult && timestampResult.token) {
          result.verification.timestampToken = {
            raw: timestampResult.token.raw,
            genTime: timestampResult.token.genTime,
            serialNumber: timestampResult.token.serialNumber,
            hashAlgorithm: 'SHA-256',
            messageImprint: timestampResult.token.messageImprint,
            tsaName: timestampResult.token.tsaName,
          };
          result.verification.timestampedAt = new Date();
          await result.verification.save();
        }
      } catch (tsError) {
        console.error('[TIMESTAMP ERROR]', tsError.message);
        // Zaman damgası hatası doğrulamayı engellemez
      }
    }

    return result;
  }

  /**
   * SMS teslim durumu kontrolü
   */
  async checkDeliveryStatus(campaignId) {
    if (!campaignId || campaignId.startsWith('MOCK_')) {
      return { status: 'DELIVERED', mock: true };
    }

    if (!this.config.username || !this.config.password) {
      throw new Error('Verimor API bilgileri eksik');
    }

    try {
      const response = await axios.get(`${this.config.apiUrl}/status`, {
        params: {
          username: this.config.username,
          password: this.config.password,
          id: campaignId,
        },
        timeout: this.config.timeout,
      });

      return {
        status: response.data?.status || 'UNKNOWN',
        timestamp: response.data?.timestamp,
        details: response.data,
      };
    } catch (error) {
      console.error('[SMS STATUS ERROR]', error.message);
      throw new Error('SMS durumu sorgulanamadi');
    }
  }

  /**
   * Aktif doğrulama kaydını getir
   */
  async getActiveVerification(relatedModel, relatedId) {
    return SmsVerification.findActiveByRelated(relatedModel, relatedId);
  }

  /**
   * Doğrulanmış kaydı getir
   */
  async getVerifiedRecord(relatedModel, relatedId) {
    return SmsVerification.findVerifiedByRelated(relatedModel, relatedId);
  }

  /**
   * Bordro onay OTP gönder
   */
  async sendBordroApprovalOtp({ phone, bordroId, employee, company, month, year }) {
    return this.sendOtp({
      phone,
      type: 'BORDRO_APPROVAL',
      relatedModel: 'Bordro',
      relatedId: bordroId,
      employee,
      company,
      messageBuilder: code => this.templates.bordroApproval(code, month, year),
    });
  }

  /**
   * İzin kabul OTP gönder
   */
  async sendLeaveAcceptanceOtp({
    phone,
    leaveRequestId,
    employee,
    company,
    startDate,
    endDate,
    days,
  }) {
    return this.sendOtp({
      phone,
      type: 'LEAVE_ACCEPTANCE',
      relatedModel: 'LeaveRequest',
      relatedId: leaveRequestId,
      employee,
      company,
      messageBuilder: code => this.templates.leaveAcceptance(code, startDate, endDate, days),
    });
  }
}

// Singleton instance
const smsService = new SmsService();

module.exports = smsService;
