/**
 * RFC 3161 Zaman Damgası Konfigürasyonu
 * TÜBİTAK BİLGEM Kamu SM ve FreeTSA desteği
 */

const timestampConfig = {
  // Ortam bazlı konfigürasyon
  development: {
    tsaUrl: process.env.TSA_URL || 'https://freetsa.org/tsr',
    enabled: true,
    mock: false,
    timeout: parseInt(process.env.TSA_TIMEOUT) || 30000,
    retryCount: parseInt(process.env.TSA_RETRY_COUNT) || 3,
    retryDelay: 1000, // ms
    hashAlgorithm: 'SHA-256'
  },

  test: {
    tsaUrl: null,
    enabled: true,
    mock: true,  // Unit testler için mock response
    timeout: 5000,
    retryCount: 1,
    retryDelay: 100,
    hashAlgorithm: 'SHA-256'
  },

  production: {
    // TÜBİTAK Kamu SM
    tsaUrl: process.env.TSA_URL || 'https://zd.kamusm.gov.tr',
    enabled: process.env.TIMESTAMP_ENABLED !== 'false',
    mock: false,
    timeout: parseInt(process.env.TSA_TIMEOUT) || 30000,
    retryCount: parseInt(process.env.TSA_RETRY_COUNT) || 3,
    retryDelay: 1000,
    hashAlgorithm: 'SHA-256',
    // TÜBİTAK için mutual TLS (mTLS) sertifikaları
    auth: {
      certPath: process.env.TSA_AUTH_CERT,
      password: process.env.TSA_AUTH_PASSWORD
    }
  }
};

// Alternatif TSA sunucuları (fallback)
const fallbackTSAs = [
  { name: 'FreeTSA', url: 'https://freetsa.org/tsr' },
  { name: 'RFC3161.ai.moda', url: 'https://rfc3161.ai.moda/' },
  { name: 'Apple', url: 'http://timestamp.apple.com/ts01' }
];

// Mevcut ortam konfigürasyonunu al
const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return timestampConfig[env] || timestampConfig.development;
};

// TSA URL'ini al (fallback destekli)
const getTsaUrl = () => {
  const config = getConfig();
  return config.tsaUrl;
};

// Zaman damgası aktif mi?
const isEnabled = () => {
  const config = getConfig();
  return config.enabled;
};

// Mock mod aktif mi?
const isMockMode = () => {
  const config = getConfig();
  return config.mock;
};

module.exports = {
  timestampConfig,
  fallbackTSAs,
  getConfig,
  getTsaUrl,
  isEnabled,
  isMockMode
};
