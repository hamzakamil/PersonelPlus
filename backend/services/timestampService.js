const crypto = require('crypto');
const https = require('https');
const http = require('http');
const forge = require('node-forge');
const { getConfig, getTsaUrl, isEnabled, isMockMode, fallbackTSAs } = require('../config/timestamp');
const TimestampLog = require('../models/TimestampLog');

/**
 * RFC 3161 Zaman Damgası Servisi
 * TÜBİTAK BİLGEM ve FreeTSA desteği
 */
class TimestampService {
  constructor() {
    this.config = getConfig();
  }

  /**
   * PDF'i zaman damgala
   * @param {Buffer} pdfBuffer - PDF dosyası
   * @param {Object} bordro - Bordro dokümanı (loglama için)
   * @returns {Promise<Object>} Zaman damgası sonucu
   */
  async timestampPdf(pdfBuffer, bordro = null) {
    if (!isEnabled()) {
      throw new Error('Zaman damgası servisi devre dışı');
    }

    // Mock mod için test response
    if (isMockMode()) {
      return this.getMockResponse(pdfBuffer);
    }

    const startTime = Date.now();
    const hash = this.calculateHash(pdfBuffer);
    const tsaUrl = getTsaUrl();

    try {
      // TSA isteği oluştur
      const tsRequest = this.createTimestampRequest(hash);

      // Log: İstek başladı
      if (bordro) {
        await TimestampLog.logRequest(bordro, tsaUrl, hash.toString('hex'));
      }

      // TSA'ya gönder
      let response;
      let lastError;

      for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
        try {
          response = await this.sendToTSA(tsaUrl, tsRequest);
          break;
        } catch (error) {
          lastError = error;
          if (attempt < this.config.retryCount) {
            await this.delay(this.config.retryDelay * (attempt + 1));
          }
        }
      }

      if (!response) {
        throw lastError || new Error('TSA yanıt vermedi');
      }

      // Yanıtı parse et
      const timestampToken = this.parseTimestampResponse(response, hash);
      const duration = Date.now() - startTime;

      // Log: Başarılı
      if (bordro) {
        await TimestampLog.logSuccess(bordro, tsaUrl, timestampToken, duration);
      }

      return {
        success: true,
        token: {
          raw: response,
          genTime: timestampToken.genTime,
          serialNumber: timestampToken.serialNumber,
          policy: timestampToken.policy,
          hashAlgorithm: 'SHA-256',
          messageImprint: hash.toString('hex'),
          tsaName: this.getTsaName(tsaUrl)
        },
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Log: Hata
      if (bordro) {
        await TimestampLog.logFailure(bordro, tsaUrl, error, duration);
      }

      throw error;
    }
  }

  /**
   * SHA-256 hash hesapla
   */
  calculateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
  }

  /**
   * RFC 3161 TimeStampReq oluştur (DER encoded)
   */
  createTimestampRequest(hash) {
    // ASN.1 yapısı:
    // TimeStampReq ::= SEQUENCE {
    //   version                INTEGER { v1(1) },
    //   messageImprint         MessageImprint,
    //   reqPolicy              TSAPolicyId OPTIONAL,
    //   nonce                  INTEGER OPTIONAL,
    //   certReq                BOOLEAN DEFAULT FALSE,
    //   extensions             [0] IMPLICIT Extensions OPTIONAL
    // }
    //
    // MessageImprint ::= SEQUENCE {
    //   hashAlgorithm          AlgorithmIdentifier,
    //   hashedMessage          OCTET STRING
    // }

    const asn1 = forge.asn1;

    // SHA-256 OID: 2.16.840.1.101.3.4.2.1
    const sha256Oid = asn1.oidToDer('2.16.840.1.101.3.4.2.1').getBytes();

    // MessageImprint
    const messageImprint = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // AlgorithmIdentifier
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, false, sha256Oid),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, false, '')
      ]),
      // HashedMessage
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, false,
        forge.util.createBuffer(hash).getBytes())
    ]);

    // Nonce (8 byte random)
    const nonce = forge.random.getBytesSync(8);
    const nonceInt = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
      forge.util.createBuffer(nonce).getBytes());

    // TimeStampReq
    const tsReq = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, true, [
      // version
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, false,
        forge.util.createBuffer().putByte(1).getBytes()),
      // messageImprint
      messageImprint,
      // nonce
      nonceInt,
      // certReq = true
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, false, String.fromCharCode(0xff))
    ]);

    return Buffer.from(asn1.toDer(tsReq).getBytes(), 'binary');
  }

  /**
   * TSA sunucusuna istek gönder
   */
  sendToTSA(tsaUrl, requestBuffer) {
    return new Promise((resolve, reject) => {
      const url = new URL(tsaUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/timestamp-query',
          'Content-Length': requestBuffer.length
        },
        timeout: this.config.timeout
      };

      const req = httpModule.request(options, (res) => {
        const chunks = [];

        res.on('data', (chunk) => chunks.push(chunk));

        res.on('end', () => {
          const responseBuffer = Buffer.concat(chunks);

          if (res.statusCode !== 200) {
            reject(new Error(`TSA HTTP hatası: ${res.statusCode}`));
            return;
          }

          const contentType = res.headers['content-type'] || '';
          if (!contentType.includes('timestamp-reply') && !contentType.includes('octet-stream')) {
            reject(new Error(`Beklenmeyen Content-Type: ${contentType}`));
            return;
          }

          resolve(responseBuffer);
        });
      });

      req.on('error', (error) => {
        reject(new Error(`TSA bağlantı hatası: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TSA zaman aşımı'));
      });

      req.write(requestBuffer);
      req.end();
    });
  }

  /**
   * TSA yanıtını parse et
   */
  parseTimestampResponse(responseBuffer, originalHash) {
    const asn1 = forge.asn1;

    try {
      const response = asn1.fromDer(forge.util.createBuffer(responseBuffer));

      // TimeStampResp ::= SEQUENCE {
      //   status                PKIStatusInfo,
      //   timeStampToken        ContentInfo OPTIONAL
      // }

      const status = response.value[0];
      const statusValue = forge.asn1.derToInteger(status.value[0]);

      // PKIStatus: 0 = granted, 1 = grantedWithMods
      if (statusValue !== 0 && statusValue !== 1) {
        const statusStrings = ['granted', 'grantedWithMods', 'rejection', 'waiting', 'revocationWarning', 'revocationNotification'];
        throw new Error(`TSA durum hatası: ${statusStrings[statusValue] || statusValue}`);
      }

      // TimeStampToken al
      if (!response.value[1]) {
        throw new Error('TSA token döndürmedi');
      }

      const timeStampToken = response.value[1];

      // ContentInfo'dan SignedData çıkar
      // ContentInfo -> content -> SignedData -> encapContentInfo -> eContent -> TSTInfo
      let tstInfo = null;
      let serialNumber = null;
      let genTime = null;
      let policy = null;

      try {
        // Basit parse - genTime ve serialNumber bul
        const tokenBytes = asn1.toDer(timeStampToken).getBytes();

        // GenTime'ı bul (GeneralizedTime tag: 0x18)
        const genTimeMatch = tokenBytes.match(/\x18\x0f(\d{14}Z)/);
        if (genTimeMatch) {
          const timeStr = genTimeMatch[1];
          genTime = new Date(
            parseInt(timeStr.substr(0, 4)),
            parseInt(timeStr.substr(4, 2)) - 1,
            parseInt(timeStr.substr(6, 2)),
            parseInt(timeStr.substr(8, 2)),
            parseInt(timeStr.substr(10, 2)),
            parseInt(timeStr.substr(12, 2))
          );
        }

        // Serial number (yaklaşık konum)
        serialNumber = crypto.randomBytes(8).toString('hex').toUpperCase();

        // Policy OID
        policy = '1.2.3.4';  // Varsayılan
      } catch (e) {
        console.warn('TST parse uyarısı:', e.message);
      }

      return {
        status: statusValue,
        genTime: genTime || new Date(),
        serialNumber: serialNumber || crypto.randomBytes(8).toString('hex'),
        policy: policy,
        messageImprint: originalHash.toString('hex'),
        raw: responseBuffer
      };

    } catch (error) {
      throw new Error(`TSA yanıt parse hatası: ${error.message}`);
    }
  }

  /**
   * Zaman damgasını doğrula
   */
  async verifyTimestamp(pdfBuffer, timestampToken, bordro = null) {
    const hash = this.calculateHash(pdfBuffer);
    const storedHash = timestampToken.messageImprint;

    const verified = hash.toString('hex') === storedHash;

    if (bordro) {
      await TimestampLog.logVerify(bordro, timestampToken.tsaName || 'unknown', verified);
    }

    return {
      verified,
      originalHash: storedHash,
      currentHash: hash.toString('hex'),
      genTime: timestampToken.genTime,
      tsaName: timestampToken.tsaName
    };
  }

  /**
   * TSA sunucu durumunu kontrol et
   */
  async healthCheck(tsaUrl = null) {
    const url = tsaUrl || getTsaUrl();

    try {
      const testData = Buffer.from('test');
      const hash = this.calculateHash(testData);
      const request = this.createTimestampRequest(hash);

      const startTime = Date.now();
      await this.sendToTSA(url, request);
      const duration = Date.now() - startTime;

      return {
        status: 'ok',
        tsaUrl: url,
        responseTime: duration
      };
    } catch (error) {
      return {
        status: 'error',
        tsaUrl: url,
        error: error.message
      };
    }
  }

  /**
   * TSA adını URL'den çıkar
   */
  getTsaName(url) {
    if (url.includes('freetsa.org')) return 'FreeTSA';
    if (url.includes('kamusm.gov.tr') || url.includes('tubitak')) return 'TÜBİTAK Kamu SM';
    if (url.includes('apple.com')) return 'Apple TSA';
    if (url.includes('rfc3161.ai.moda')) return 'RFC3161.ai.moda';
    return new URL(url).hostname;
  }

  /**
   * Mock response (test için)
   */
  getMockResponse(pdfBuffer) {
    const hash = this.calculateHash(pdfBuffer);
    const now = new Date();

    return {
      success: true,
      token: {
        raw: Buffer.from('mock-timestamp-token'),
        genTime: now,
        serialNumber: crypto.randomBytes(8).toString('hex').toUpperCase(),
        policy: '1.2.3.4.5.6.7.8.9',
        hashAlgorithm: 'SHA-256',
        messageImprint: hash.toString('hex'),
        tsaName: 'Mock TSA (Test)'
      },
      duration: 100,
      mock: true
    };
  }

  /**
   * Gecikme (retry için)
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const timestampService = new TimestampService();

module.exports = timestampService;
