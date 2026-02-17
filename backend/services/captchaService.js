const axios = require('axios');

/**
 * Google reCAPTCHA v2 sunucu taraflı doğrulama
 * @param {string} token - reCAPTCHA response token (frontendden)
 * @param {string} remoteIp - Client IP adresi (opsiyonel)
 * @returns {Promise<{success: boolean, errorCodes?: string[]}>}
 */
const verifyCaptcha = async (token, remoteIp = null) => {
  // Development modunda secret key yoksa bypass
  if (process.env.NODE_ENV === 'development' && !process.env.RECAPTCHA_SECRET_KEY) {
    console.warn('CAPTCHA dogrulama atlandi (development modu, RECAPTCHA_SECRET_KEY yok)');
    return { success: true };
  }

  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY env degiskeni ayarlanmamis');
    return { success: false, errorCodes: ['missing-secret-key'] };
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      params,
      { timeout: 5000 }
    );

    return {
      success: response.data.success === true,
      errorCodes: response.data['error-codes'] || [],
    };
  } catch (error) {
    console.error('reCAPTCHA dogrulama hatasi:', error.message);
    return { success: false, errorCodes: ['verification-failed'] };
  }
};

module.exports = { verifyCaptcha };
