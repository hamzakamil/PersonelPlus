/**
 * e-Fatura Entegratör Factory
 * Birden fazla entegratör desteği için merkezi yönetim
 */

const BaseIntegrator = require('./baseIntegrator');
const ForibaIntegrator = require('./foribaIntegrator');
const MockIntegrator = require('./mockIntegrator');

// Entegratör registry
const INTEGRATORS = {
  foriba: ForibaIntegrator,
  mock: MockIntegrator
  // Gelecekte eklenecekler:
  // logo: LogoIntegrator,
  // parasut: ParasutIntegrator,
  // nes: NesIntegrator,
  // turkcell: TurkcellIntegrator
};

// Aktif entegratör instance cache
const integratorInstances = new Map();

/**
 * Entegratör instance al veya oluştur
 * @param {string} name - Entegratör adı
 * @param {Object} config - Yapılandırma
 * @returns {BaseIntegrator}
 */
function getIntegrator(name, config = {}) {
  if (!INTEGRATORS[name]) {
    throw new Error(`Bilinmeyen entegratör: ${name}. Mevcut entegratörler: ${Object.keys(INTEGRATORS).join(', ')}`);
  }

  const cacheKey = `${name}_${JSON.stringify(config)}`;

  if (!integratorInstances.has(cacheKey)) {
    const IntegratorClass = INTEGRATORS[name];
    integratorInstances.set(cacheKey, new IntegratorClass(config));
  }

  return integratorInstances.get(cacheKey);
}

/**
 * Varsayılan entegratör al (environment'a göre)
 * @param {Object} config - Yapılandırma
 * @returns {BaseIntegrator}
 */
function getDefaultIntegrator(config = {}) {
  const integratorName = process.env.EFATURA_INTEGRATOR || 'mock';
  const integratorConfig = {
    testMode: process.env.EFATURA_TEST_MODE === 'true',
    username: process.env.EFATURA_USERNAME,
    password: process.env.EFATURA_PASSWORD,
    serviceId: process.env.EFATURA_SERVICE_ID,
    ...config
  };

  return getIntegrator(integratorName, integratorConfig);
}

/**
 * Mevcut entegratörleri listele
 * @returns {Array<string>}
 */
function listIntegrators() {
  return Object.keys(INTEGRATORS);
}

/**
 * Entegratör kaydet (dinamik ekleme için)
 * @param {string} name - Entegratör adı
 * @param {class} IntegratorClass - Entegratör sınıfı
 */
function registerIntegrator(name, IntegratorClass) {
  if (!(IntegratorClass.prototype instanceof BaseIntegrator)) {
    throw new Error('Entegratör BaseIntegrator sınıfını extend etmeli');
  }

  INTEGRATORS[name] = IntegratorClass;
}

/**
 * Tüm entegratörleri test et
 * @returns {Promise<Object>}
 */
async function testAllIntegrators() {
  const results = {};

  for (const name of Object.keys(INTEGRATORS)) {
    try {
      const integrator = getIntegrator(name, { testMode: true });
      const testResult = await integrator.testConnection();
      results[name] = testResult;
    } catch (error) {
      results[name] = {
        success: false,
        message: error.message
      };
    }
  }

  return results;
}

/**
 * Cache'i temizle
 */
function clearCache() {
  integratorInstances.clear();
}

// Servis fonksiyonları

/**
 * Fatura gönder
 * @param {Object} invoice - Invoice model instance
 * @param {string} xml - UBL-TR XML
 * @param {string} integratorName - Entegratör adı (opsiyonel)
 * @returns {Promise<Object>}
 */
async function sendInvoice(invoice, xml, integratorName = null) {
  const integrator = integratorName
    ? getIntegrator(integratorName)
    : getDefaultIntegrator();

  if (invoice.isEArchive) {
    return integrator.sendEArchiveInvoice(invoice, xml);
  }

  return integrator.sendInvoice(invoice, xml);
}

/**
 * Fatura durumu sorgula
 * @param {string} uuid - Fatura UUID
 * @param {string} integratorName - Entegratör adı (opsiyonel)
 * @returns {Promise<Object>}
 */
async function getInvoiceStatus(uuid, integratorName = null) {
  const integrator = integratorName
    ? getIntegrator(integratorName)
    : getDefaultIntegrator();

  return integrator.getInvoiceStatus(uuid);
}

/**
 * Fatura iptal et
 * @param {string} uuid - Fatura UUID
 * @param {string} reason - İptal nedeni
 * @param {string} integratorName - Entegratör adı (opsiyonel)
 * @returns {Promise<Object>}
 */
async function cancelInvoice(uuid, reason, integratorName = null) {
  const integrator = integratorName
    ? getIntegrator(integratorName)
    : getDefaultIntegrator();

  return integrator.cancelInvoice(uuid, reason);
}

/**
 * Mükellef sorgula
 * @param {string} taxNumber - VKN veya TCKN
 * @param {string} integratorName - Entegratör adı (opsiyonel)
 * @returns {Promise<Object>}
 */
async function checkTaxpayer(taxNumber, integratorName = null) {
  const integrator = integratorName
    ? getIntegrator(integratorName)
    : getDefaultIntegrator();

  return integrator.checkTaxpayer(taxNumber);
}

/**
 * PDF indir
 * @param {string} uuid - Fatura UUID
 * @param {string} integratorName - Entegratör adı (opsiyonel)
 * @returns {Promise<Buffer>}
 */
async function downloadPdf(uuid, integratorName = null) {
  const integrator = integratorName
    ? getIntegrator(integratorName)
    : getDefaultIntegrator();

  return integrator.downloadPdf(uuid);
}

/**
 * XML indir
 * @param {string} uuid - Fatura UUID
 * @param {string} integratorName - Entegratör adı (opsiyonel)
 * @returns {Promise<string>}
 */
async function downloadXml(uuid, integratorName = null) {
  const integrator = integratorName
    ? getIntegrator(integratorName)
    : getDefaultIntegrator();

  return integrator.downloadXml(uuid);
}

module.exports = {
  // Factory fonksiyonları
  getIntegrator,
  getDefaultIntegrator,
  listIntegrators,
  registerIntegrator,
  testAllIntegrators,
  clearCache,

  // Servis fonksiyonları
  sendInvoice,
  getInvoiceStatus,
  cancelInvoice,
  checkTaxpayer,
  downloadPdf,
  downloadXml,

  // Sınıflar (extend etmek için)
  BaseIntegrator,
  ForibaIntegrator,
  MockIntegrator
};
