const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Role = require('../models/Role');
const Dealer = require('../models/Dealer');
const Company = require('../models/Company');
const Settings = require('../models/Settings');
const RegistrationRequest = require('../models/RegistrationRequest');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
const { successResponse, errorResponse, serverError } = require('../utils/responseHelper');
const { sendRegistrationVerificationEmail, sendPasswordAtRiskEmail, sendAdminRegistrationNotification } = require('../services/emailService');
const LoginAttempt = require('../models/LoginAttempt');
const { verifyCaptcha } = require('../services/captchaService');
const Employee = require('../models/Employee');
const { normalizePhone } = require('../utils/phoneUtils');

// Register - Yeni kullanıcı kaydı
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, phone, companyName, referralCode } = req.body;

    // Validasyonlar
    if (!email || typeof email !== 'string') {
      return errorResponse(res, { message: 'Email adresi gereklidir' });
    }

    if (!password || password.length < 6) {
      return errorResponse(res, { message: 'Şifre en az 6 karakter olmalıdır' });
    }

    if (!fullName || fullName.trim().length < 2) {
      return errorResponse(res, { message: 'Ad Soyad gereklidir' });
    }

    if (!companyName || companyName.trim().length < 2) {
      return errorResponse(res, { message: 'Firma adı gereklidir' });
    }

    // Email kontrolü
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return errorResponse(res, { message: 'Bu email adresi zaten kayıtlı' });
    }

    // company_admin rolünü bul
    const companyAdminRole = await Role.findOne({ name: 'company_admin' });
    if (!companyAdminRole) {
      return errorResponse(res, { message: 'Sistem hatası: Rol bulunamadı' });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı oluştur (dealer ve company null, isActive false)
    const user = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: companyAdminRole._id,
      dealer: null,
      company: null,
      isActive: false, // Super admin onayı bekleyecek
      mustChangePassword: false,
    });

    await user.save();

    // Referans kodu ile bayi bul (opsiyonel)
    let referredDealer = null;
    if (referralCode && referralCode.trim()) {
      referredDealer = await Dealer.findOne({
        referralCode: referralCode.trim().toUpperCase(),
        isActive: true,
      });
    }

    // Kayıt talebini oluştur
    const registrationRequest = new RegistrationRequest({
      user: user._id,
      fullName: fullName.trim(),
      phone: phone || '',
      companyName: companyName.trim(),
      status: 'pending',
      referralCode: referredDealer ? referralCode.trim().toUpperCase() : null,
      dealer: referredDealer ? referredDealer._id : null,
    });

    await registrationRequest.save();

    // Kayıt modunu kontrol et
    const settings = await Settings.getSettings();

    if (settings.registrationMode === 'email_verification') {
      // Email doğrulama modu: Token oluştur ve email gönder
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.activationToken = hashedToken;
      user.activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
      await user.save();

      // Email doğrulama manual onayın yerine geçer
      registrationRequest.status = 'approved';
      registrationRequest.processedAt = new Date();
      registrationRequest.notes = 'Email doğrulama modu - otomatik onay';
      await registrationRequest.save();

      // Email gönder (fire-and-forget)
      sendRegistrationVerificationEmail(user.email, fullName.trim(), rawToken).catch(err =>
        console.error('Email doğrulama gönderim hatası:', err)
      );

      return successResponse(res, {
        message:
          'Kayıt başarılı! Email adresinize bir doğrulama linki gönderildi. Lütfen email kutunuzu kontrol edin.',
        data: { email: user.email, mode: 'email_verification' },
      });
    }

    // Manuel onay modu (varsayılan)
    return successResponse(res, {
      message:
        'Kayıt başarılı. Hesabınız onay bekliyor. Onaylandıktan sonra giriş yapabileceksiniz.',
      data: { email: user.email, mode: 'manual_approval' },
    });
  } catch (error) {
    console.error('Kayıt hatası:', error);
    return serverError(res, error, 'Kayıt hatası');
  }
});

// ===== Login Yardımcı Fonksiyonları =====

// Çoklu identifier ile kullanıcı bulma (email, TC Kimlik, telefon, vergi no)
async function resolveUserByIdentifier(identifier) {
  const trimmed = identifier.trim().toLowerCase();
  const populateOpts = [
    { path: 'role' },
    { path: 'dealer' },
    { path: 'company' }
  ];

  // 1. Direkt email ile ara
  let user = await User.findOne({ email: trimmed }).populate(populateOpts);
  if (user) return user;

  // 2. 11 haneli sayı → TC Kimlik
  if (/^\d{11}$/.test(trimmed)) {
    // Önce placeholder email ile dene
    user = await User.findOne({ email: `${trimmed}@personelplus.com` }).populate(populateOpts);
    if (user) return user;
    // Yoksa Employee.tcKimlik → User (email değişmiş olabilir)
    const emp = await Employee.findOne({ tcKimlik: trimmed });
    if (emp) {
      user = await User.findOne({ employee: emp._id }).populate(populateOpts);
      if (user) return user;
    }
  }

  // 3. 10 haneli sayı → Vergi No
  if (/^\d{10}$/.test(trimmed)) {
    user = await User.findOne({ email: `${trimmed}@personelplus.com` }).populate(populateOpts);
    if (user) return user;
  }

  // 4. Telefon numarası (05xx, +90, 5xx pattern)
  const phoneDigits = trimmed.replace(/\D/g, '');
  if (phoneDigits.length >= 10 && phoneDigits.length <= 12) {
    const normalized = normalizePhone(phoneDigits);
    if (normalized) {
      const emp = await Employee.findOne({ phone: normalized });
      if (emp) {
        user = await User.findOne({ employee: emp._id }).populate(populateOpts);
        if (user) return user;
      }
    }
  }

  return null;
}

function buildUserPayload(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role.name,
    dealer: user.dealer,
    company: user.company,
    mustChangePassword: user.mustChangePassword,
  };
}

async function attachEmployeeName(userPayload, user) {
  let emp = null;
  if (user.employee) {
    const empId = user.employee._id || user.employee;
    emp = await Employee.findById(empId).select('firstName lastName');
  }
  if (!emp) {
    emp = await Employee.findOne({
      email: user.email.toLowerCase().trim(),
      company: user.company._id || user.company,
    }).select('firstName lastName');
  }
  if (emp) userPayload.employeeName = `${emp.firstName} ${emp.lastName}`.trim();
}

function loginFailureResponse(res, loginAttempt) {
  if (!loginAttempt) {
    return errorResponse(res, { message: 'Email veya şifre hatalı', statusCode: 401 });
  }

  // 9+ başarısız deneme: hesap kilitli
  if (loginAttempt.isLocked()) {
    const remainingSeconds = loginAttempt.getRemainingLockSeconds();
    return errorResponse(res, {
      message: `Çok fazla başarısız deneme. Hesabınız ${Math.ceil(remainingSeconds / 60)} dakika süreyle kilitlendi.`,
      statusCode: 423,
      errorCode: 'LOGIN_ACCOUNT_LOCKED',
      data: {
        lockedUntil: loginAttempt.lockedUntil,
        remainingSeconds,
      },
    });
  }

  // 3+ başarısız deneme: bir sonraki deneme için CAPTCHA gerekli
  if (loginAttempt.isCaptchaRequired()) {
    return errorResponse(res, {
      message: 'Email veya şifre hatalı. Güvenlik doğrulaması gerekli.',
      statusCode: 401,
      errorCode: 'LOGIN_CAPTCHA_REQUIRED',
      data: { attemptNumber: loginAttempt.failedAttempts },
    });
  }

  // 1-2 başarısız deneme: rate limit bilgisi
  const delay = loginAttempt.getRateLimitDelay();
  if (delay > 0) {
    return errorResponse(res, {
      message: 'Email veya şifre hatalı.',
      statusCode: 401,
      errorCode: 'LOGIN_RATE_LIMITED',
      data: {
        retryAfter: Math.ceil(delay / 1000),
        attemptNumber: loginAttempt.failedAttempts,
      },
    });
  }

  // İlk başarısız deneme: normal mesaj
  return errorResponse(res, { message: 'Email veya şifre hatalı', statusCode: 401 });
}

function sendPasswordAtRiskWarning(user, previousAttempts, clientIp) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  User.findByIdAndUpdate(user._id, {
    resetPasswordToken: hashedToken,
    resetPasswordExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).catch(err => console.error('Reset token kaydetme hatası:', err));

  sendPasswordAtRiskEmail(user.email, rawToken, previousAttempts, clientIp).catch(err =>
    console.error('Şifre risk uyarısı email gönderim hatası:', err)
  );
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    if (!email || typeof email !== 'string') {
      return errorResponse(res, { message: 'Kullanıcı bilgisi gereklidir' });
    }

    const loginIdentifier = email.trim().toLowerCase();
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;

    // ===== ADIM 1: Kullanıcıyı bul (email, TC, telefon veya vergi no) =====
    const user = await resolveUserByIdentifier(loginIdentifier);

    // LoginAttempt için user email'ini kullan (bulunduysa), yoksa girilen identifier'ı
    const attemptEmail = user ? user.email : loginIdentifier;

    const loginAttempt = await LoginAttempt.findOrCreateByEmail(attemptEmail);

    // Hesap kilitli mi?
    if (loginAttempt.isLocked()) {
      const remainingSeconds = loginAttempt.getRemainingLockSeconds();
      return errorResponse(res, {
        message: `Çok fazla başarısız deneme. Hesabınız geçici olarak kilitlendi. ${Math.ceil(remainingSeconds / 60)} dakika sonra tekrar deneyin.`,
        statusCode: 423,
        errorCode: 'LOGIN_ACCOUNT_LOCKED',
        data: {
          lockedUntil: loginAttempt.lockedUntil,
          remainingSeconds,
        },
      });
    }

    // ===== ADIM 2: Rate limit kontrolü (2-3. denemeler) =====
    const rateLimitDelay = loginAttempt.getRateLimitDelay();
    if (rateLimitDelay > 0 && loginAttempt.lastFailedAt) {
      const elapsed = Date.now() - loginAttempt.lastFailedAt.getTime();
      if (elapsed < rateLimitDelay) {
        const retryAfter = Math.ceil((rateLimitDelay - elapsed) / 1000);
        return errorResponse(res, {
          message: `Lütfen ${retryAfter} saniye bekleyip tekrar deneyin.`,
          statusCode: 429,
          errorCode: 'LOGIN_RATE_LIMITED',
          data: {
            retryAfter,
            attemptNumber: loginAttempt.failedAttempts,
          },
        });
      }
    }

    // ===== ADIM 3: CAPTCHA kontrolü (4+ denemeler) =====
    if (loginAttempt.isCaptchaRequired()) {
      if (!captchaToken) {
        return errorResponse(res, {
          message: 'Güvenlik doğrulaması (CAPTCHA) gereklidir.',
          statusCode: 401,
          errorCode: 'LOGIN_CAPTCHA_REQUIRED',
          data: { attemptNumber: loginAttempt.failedAttempts },
        });
      }

      const captchaResult = await verifyCaptcha(captchaToken, clientIp);
      if (!captchaResult.success) {
        return errorResponse(res, {
          message: 'CAPTCHA doğrulaması başarısız. Lütfen tekrar deneyin.',
          statusCode: 401,
          errorCode: 'LOGIN_CAPTCHA_REQUIRED',
          data: { attemptNumber: loginAttempt.failedAttempts },
        });
      }
    }

    // ===== ADIM 4: Kullanıcı doğrulama =====
    if (!user) {
      await LoginAttempt.recordFailure(attemptEmail, clientIp);
      const updated = await LoginAttempt.findOne({ email: attemptEmail });
      return loginFailureResponse(res, updated);
    }

    if (!user.isActive) {
      // Kullanıcının kayıt talebini kontrol et
      const registrationRequest = await RegistrationRequest.findOne({ user: user._id }).sort({ createdAt: -1 });

      // Email doğrulama token'ı var mı ve hala geçerli mi kontrol et
      const hasValidActivationToken = user.activationToken && user.activationTokenExpires && user.activationTokenExpires > new Date();

      // Email doğrulama modunda mı?
      const settings = await Settings.getSettings();
      const isEmailVerificationMode = settings.registrationMode === 'email_verification';

      if (hasValidActivationToken && isEmailVerificationMode) {
        // Email doğrulama bekleniyor
        return errorResponse(res, {
          message: 'Hesabınız aktif değil. Email adresinize gönderilen doğrulama linkine tıklayın.',
          statusCode: 401,
          errorCode: 'ACCOUNT_INACTIVE',
          data: {
            activationMethod: 'email_verification',
            canResendEmail: true,
          }
        });
      } else if (registrationRequest && registrationRequest.status === 'pending') {
        // Manuel onay bekleniyor
        return errorResponse(res, {
          message: 'Hesabınız aktif değil. Admin onayı bekleniyor.',
          statusCode: 401,
          errorCode: 'ACCOUNT_INACTIVE',
          data: {
            activationMethod: 'manual_approval',
            canResendEmail: false,
          }
        });
      } else {
        // Genel aktif değil mesajı
        return errorResponse(res, {
          message: 'Hesabınız aktif değil',
          statusCode: 401,
          errorCode: 'ACCOUNT_INACTIVE',
          data: {
            activationMethod: 'unknown',
            canResendEmail: false,
          }
        });
      }
    }

    // Employee rolü için işten çıkış tarihi kontrolü
    if (user.role.name === 'employee' && user.company) {
      const employee = user.employee
        ? await Employee.findById(user.employee)
        : await Employee.findOne({ email: user.email, company: user.company });

      if (employee && employee.exitDate) {
        const exitDate = new Date(employee.exitDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        exitDate.setHours(0, 0, 0, 0);

        if (exitDate <= today) {
          return errorResponse(res, {
            message: 'İşten çıkış tarihiniz geçtiği için giriş yapamazsınız',
            statusCode: 401,
          });
        }
      }
    }

    // Employee ilk giriş: şifresi yoksa direkt giriş yap (şifre belirleme gerekiyor)
    if (user.role.name === 'employee' && !user.password) {
      const previousAttempts = loginAttempt.failedAttempts;
      await LoginAttempt.resetAttempts(attemptEmail);
      if (previousAttempts > 0) {
        sendPasswordAtRiskWarning(user, previousAttempts, clientIp);
      }
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const userPayload = buildUserPayload(user);
      userPayload.mustChangePassword = true;
      if (user.company) await attachEmployeeName(userPayload, user);
      return successResponse(res, {
        data: { token, user: userPayload, requiresPasswordSetup: true },
        message: 'Giriş başarılı, şifre belirlenmesi gerekiyor',
      });
    }

    // Normal giriş: Şifre kontrolü yap
    if (!password) {
      return errorResponse(res, { message: 'Şifre gereklidir', statusCode: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await LoginAttempt.recordFailure(attemptEmail, clientIp);
      const updated = await LoginAttempt.findOne({ email: attemptEmail });
      return loginFailureResponse(res, updated);
    }

    // ===== BAŞARILI GİRİŞ =====
    const previousAttempts = loginAttempt.failedAttempts;
    await LoginAttempt.resetAttempts(attemptEmail);

    // Önceki başarısız denemeler varsa güvenlik uyarı emaili gönder
    if (previousAttempts > 0) {
      sendPasswordAtRiskWarning(user, previousAttempts, clientIp);
    }

    // company_admin için şirket aktivasyonu
    if (user.role.name === 'company_admin' && user.company) {
      const company = await Company.findById(user.company);
      if (company && !company.isActivated) {
        company.isActivated = true;
        company.activatedAt = new Date();
        await company.save();
      }
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userPayload = buildUserPayload(user);

    if (user.role.name === 'employee' && user.company) {
      await attachEmployeeName(userPayload, user);
    }

    const responseData = { token, user: userPayload };

    // mustChangePassword olan kullanıcılar (tüm roller — company_admin dahil)
    if (user.mustChangePassword) {
      responseData.requiresPasswordSetup = true;
      userPayload.mustChangePassword = true;
    }

    return successResponse(res, {
      data: responseData,
      message: user.mustChangePassword ? 'Giriş başarılı, şifre belirlenmesi gerekiyor' : 'Giriş başarılı',
    });
  } catch (error) {
    return serverError(res, error, 'Giriş hatası');
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('role')
      .populate('dealer')
      .populate('company');

    const payload = {
      id: user._id,
      email: user.email,
      role: user.role.name,
      dealer: user.dealer,
      company: user.company,
      mustChangePassword: user.mustChangePassword,
    };

    // Çalışan rolü için Ad Soyad ekle
    if (user.role.name === 'employee' && user.company) {
      let employee = null;
      if (user.employee) {
        const empId = user.employee._id || user.employee;
        employee = await Employee.findById(empId).select('firstName lastName');
      }
      if (!employee) {
        employee = await Employee.findOne({
          email: user.email.toLowerCase().trim(),
          company: user.company._id || user.company,
        }).select('firstName lastName');
      }
      if (employee) {
        payload.employeeName = `${employee.firstName} ${employee.lastName}`.trim();
      }
    }

    return successResponse(res, { data: payload });
  } catch (error) {
    return serverError(res, error);
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, newEmail, newPhone } = req.body;

    if (!newPassword) {
      return errorResponse(res, { message: 'Yeni şifre gereklidir' });
    }

    if (newPassword.length < 6) {
      return errorResponse(res, { message: 'Yeni şifre en az 6 karakter olmalıdır' });
    }

    const user = await User.findById(req.user._id).populate('role');

    // Placeholder email kontrolü
    const isPlaceholderEmail = user.email.endsWith('@personelplus.com') || user.email.endsWith('@placeholder.com');

    // Placeholder email olan kullanıcılar için gerçek email ve telefon zorunlu
    if (user.mustChangePassword && isPlaceholderEmail) {
      if (!newEmail || !newEmail.trim()) {
        return errorResponse(res, { message: 'Email adresi gereklidir' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail.trim())) {
        return errorResponse(res, { message: 'Geçerli bir email adresi girin' });
      }
      // Placeholder domain'lere izin verme
      if (newEmail.trim().toLowerCase().endsWith('@personelplus.com') || newEmail.trim().toLowerCase().endsWith('@placeholder.com')) {
        return errorResponse(res, { message: 'Lütfen gerçek bir email adresi girin' });
      }
      if (!newPhone || !newPhone.trim()) {
        return errorResponse(res, { message: 'Telefon numarası gereklidir' });
      }
      // Email unique kontrolü
      const existingUser = await User.findOne({ email: newEmail.trim().toLowerCase(), _id: { $ne: user._id } });
      if (existingUser) {
        return errorResponse(res, { message: 'Bu email adresi zaten kullanılıyor' });
      }
    }

    // Verify current password (if not first login and password exists)
    if (!user.mustChangePassword && user.password) {
      if (!currentPassword) {
        return errorResponse(res, { message: 'Mevcut şifre gereklidir' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return errorResponse(res, { message: 'Mevcut şifre hatalı', statusCode: 401 });
      }
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.mustChangePassword = false;

    // Placeholder email ise gerçek email ve telefon güncelle
    if (isPlaceholderEmail && newEmail) {
      const oldEmail = user.email;
      user.email = newEmail.trim().toLowerCase();

      // Employee kaydını güncelle
      if (user.employee) {
        const employee = await Employee.findById(user.employee);
        if (employee) {
          employee.email = newEmail.trim().toLowerCase();
          if (newPhone) employee.phone = newPhone.trim();
          if (!employee.isActivated) {
            employee.isActivated = true;
            employee.activatedAt = new Date();
          }
          await employee.save();
        }
      }

      // Company admin ise şirket bilgilerini güncelle
      if (user.role && user.role.name === 'company_admin' && user.company) {
        const company = await Company.findById(user.company);
        if (company) {
          if (company.contactEmail === oldEmail || !company.contactEmail) {
            company.contactEmail = newEmail.trim().toLowerCase();
          }
          if (company.authorizedPerson && company.authorizedPerson.email === oldEmail) {
            company.authorizedPerson.email = newEmail.trim().toLowerCase();
          }
          await company.save();
        }
      }
    } else if (newPhone && user.employee) {
      // Sadece telefon güncelleme (email değişmeden)
      const employee = await Employee.findById(user.employee);
      if (employee) {
        employee.phone = newPhone.trim();
        await employee.save();
      }
    }

    await user.save();

    // If employee, also activate the employee record
    if (user.role.name === 'employee' && user.employee) {
      const employee = await Employee.findById(user.employee);
      if (employee && !employee.isActivated) {
        employee.isActivated = true;
        employee.activatedAt = new Date();
        await employee.save();
      }
    }

    return successResponse(res, { message: 'Bilgileriniz başarıyla güncellendi' });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * POST /activate-account
 * Aktivasyon token ile hesap aktive etme ve şifre belirleme
 */
router.post('/activate-account', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return errorResponse(res, { message: 'Token ve şifre gereklidir' });
    }

    if (password.length < 6) {
      return errorResponse(res, { message: 'Şifre en az 6 karakter olmalıdır' });
    }

    // Token'ı hash'le ve bul
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      activationToken: hashedToken,
      activationTokenExpires: { $gt: Date.now() },
    }).populate('role');

    if (!user) {
      return errorResponse(res, { message: 'Geçersiz veya süresi dolmuş aktivasyon linki' });
    }

    // Şifreyi güncelle ve hesabı aktive et
    user.password = await bcrypt.hash(password, 10);
    user.isActive = true;
    user.activationToken = null;
    user.activationTokenExpires = null;
    user.mustChangePassword = false;
    await user.save();

    // Employee kaydını da aktive et (varsa)
    if (user.role?.name === 'employee') {
      const Employee = require('../models/Employee');
      const employee = await Employee.findOne({ email: user.email });
      if (employee && !employee.isActivated) {
        employee.isActivated = true;
        employee.activatedAt = new Date();
        await employee.save();
      }
    }

    // JWT token oluştur
    const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    return successResponse(res, {
      data: {
        token: jwtToken,
        user: {
          _id: user._id,
          email: user.email,
          role: user.role,
        },
      },
      message: 'Hesabınız başarıyla aktive edildi',
    });
  } catch (error) {
    console.error('Aktivasyon hatası:', error);
    return serverError(res, error);
  }
});

/**
 * GET /verify-email/:token
 * Email doğrulama - Kayıt sırasında gönderilen link ile hesabı aktive eder
 * Şifre gerekmez (kullanıcı kayıt sırasında zaten şifre belirliyor)
 */
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      activationToken: hashedToken,
      activationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return errorResponse(res, {
        message: 'Geçersiz veya süresi dolmuş doğrulama linki',
        statusCode: 400,
      });
    }

    // Kullanıcının henüz bayi/şirketi yoksa oluştur (kayıt akışı)
    if (!user.dealer && !user.company) {
      const regRequest = await RegistrationRequest.findOne({ user: user._id });
      if (regRequest) {
        // Bayi belirle: referans kodundan gelen varsa onu kullan
        let targetDealer;
        if (regRequest.dealer) {
          targetDealer = await Dealer.findById(regRequest.dealer);
        }
        if (!targetDealer) {
          targetDealer = await Dealer.findOne({ name: 'Bireysel Kayıtlar' });
          if (!targetDealer) {
            targetDealer = new Dealer({
              name: 'Bireysel Kayıtlar',
              contactEmail: 'system@personelplus.com',
              isActive: true,
            });
            await targetDealer.save();
          }
        }

        const company = new Company({
          name: regRequest.companyName,
          dealer: targetDealer._id,
          contactEmail: user.email,
          contactPhone: regRequest.phone || '',
          authorizedPerson: {
            fullName: regRequest.fullName,
            phone: regRequest.phone || '',
            email: user.email,
          },
          isActive: true,
        });
        await company.save();

        // Varsayılan Merkez işyeri oluştur
        const Workplace = require('../models/Workplace');
        const defaultWorkplace = new Workplace({
          name: 'Merkez',
          company: company._id,
          isDefault: true,
          isActive: true,
        });
        await defaultWorkplace.save();

        user.dealer = targetDealer._id;
        user.company = company._id;
      }
    }

    // Hesabı aktive et
    user.isActive = true;
    user.activationToken = null;
    user.activationTokenExpires = null;
    await user.save();

    return successResponse(res, {
      data: { verified: true, email: user.email },
      message: 'Email adresiniz başarıyla doğrulandı! Artık giriş yapabilirsiniz.',
    });
  } catch (error) {
    console.error('Email doğrulama hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /resend-verification
 * Email doğrulama linkini tekrar gönder
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, { message: 'Email adresi gereklidir' });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isActive: false,
    });

    if (!user) {
      // Güvenlik: Kullanıcı bulunamasa bile başarılı mesaj göster
      return successResponse(res, {
        message: 'Eğer bu email adresi sistemde kayıtlıysa, doğrulama linki gönderildi.',
      });
    }

    // Rate limit: Son 1 saatte gönderilen email sayısını kontrol et
    if (user.activationTokenExpires) {
      const tokenAge = Date.now() - (user.activationTokenExpires.getTime() - 24 * 60 * 60 * 1000);
      // Token 5 dakikadan daha yeni oluşturulmuşsa tekrar gönderme
      if (tokenAge < 5 * 60 * 1000) {
        return errorResponse(res, {
          message: 'Lütfen birkaç dakika bekleyip tekrar deneyin.',
          statusCode: 429,
        });
      }
    }

    // Yeni token oluştur
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.activationToken = hashedToken;
    user.activationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
    await user.save();

    // RegistrationRequest'ten kullanıcı adını al
    const regRequest = await RegistrationRequest.findOne({ user: user._id });
    const fullName = regRequest?.fullName || 'Kullanıcı';

    // Email gönder
    sendRegistrationVerificationEmail(user.email, fullName, rawToken).catch(err =>
      console.error('Email doğrulama tekrar gönderim hatası:', err)
    );

    return successResponse(res, {
      message: 'Doğrulama emaili tekrar gönderildi. Lütfen email kutunuzu kontrol edin.',
    });
  } catch (error) {
    console.error('Resend verification hatası:', error);
    return serverError(res, error);
  }
});

/**
 * GET /verify-activation-token/:token
 * Aktivasyon token'ının geçerliliğini kontrol et
 */
router.get('/verify-activation-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      activationToken: hashedToken,
      activationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return errorResponse(res, {
        message: 'Geçersiz veya süresi dolmuş aktivasyon linki',
      });
    }

    return successResponse(res, {
      data: { valid: true, email: user.email },
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * POST /forgot-password
 * Şifre sıfırlama talebi - Email gönder
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return errorResponse(res, { message: 'Email adresi zorunludur' });
    }

    // Email formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse(res, { message: 'Geçerli bir email adresi giriniz' });
    }

    // Email normalizasyonu (Türkçe karakterler için)
    const normalizedEmail = email
      .replace(/İ/g, 'i')  // Türkçe İ -> i
      .replace(/I/g, 'i')  // İngilizce I -> i (email'lerde hep i olmalı)
      .toLowerCase()
      .trim();

    // Kullanıcıyı bul
    const user = await User.findOne({ email: normalizedEmail });

    // Security: Her zaman başarılı yanıt döndür (user enumeration saldırısını önle)
    if (!user) {
      return res.json({
        success: true,
        message: 'Eğer bu email adresi sistemde kayıtlıysa, şifre sıfırlama linki gönderildi'
      });
    }

    // Reset token oluştur (crypto.randomBytes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token'ı veritabanına kaydet (1 saat geçerli)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Email gönder
    const emailService = require('../services/emailService');
    const userName = user.firstName || user.fullName || 'Kullanıcı';
    await emailService.sendForgotPasswordEmail(user.email, userName, resetToken);

    // Başarılı yanıt
    res.json({
      success: true,
      message: 'Eğer bu email adresi sistemde kayıtlıysa, şifre sıfırlama linki gönderildi'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return serverError(res, error, 'Şifre sıfırlama talebi gönderilirken hata oluştu');
  }
});

/**
 * GET /verify-reset-token/:token
 * Şifre sıfırlama token'ının geçerliliğini kontrol et
 */
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return errorResponse(res, {
        message: 'Geçersiz veya süresi dolmuş şifre sıfırlama linki',
      });
    }

    return successResponse(res, {
      data: { valid: true, email: user.email },
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * POST /reset-password
 * Token ile şifre sıfırlama
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return errorResponse(res, { message: 'Token ve yeni şifre gereklidir' });
    }

    if (password.length < 6) {
      return errorResponse(res, { message: 'Şifre en az 6 karakter olmalıdır' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return errorResponse(res, {
        message: 'Geçersiz veya süresi dolmuş şifre sıfırlama linki',
        statusCode: 400,
      });
    }

    // Şifreyi güncelle ve token'ı temizle
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.mustChangePassword = false;
    await user.save();

    return successResponse(res, {
      message: 'Şifreniz başarıyla değiştirildi. Artık yeni şifrenizle giriş yapabilirsiniz.',
    });
  } catch (error) {
    console.error('Şifre sıfırlama hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /notify-admin
 * Manuel onay bekleyen kullanıcı admin'e bildirim gönderir
 */
router.post('/notify-admin', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return errorResponse(res, { message: 'Email adresi gereklidir' });
    }

    const normalizedEmail = email
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .toLowerCase()
      .trim();

    // Kullanıcıyı bul
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return errorResponse(res, { message: 'Kullanıcı bulunamadı', statusCode: 404 });
    }

    // Kullanıcı zaten aktif mi?
    if (user.isActive) {
      return errorResponse(res, { message: 'Hesabınız zaten aktif', statusCode: 400 });
    }

    // Kayıt talebini bul
    const registrationRequest = await RegistrationRequest.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (!registrationRequest) {
      return errorResponse(res, { message: 'Kayıt talebi bulunamadı', statusCode: 404 });
    }

    // Eğer kayıt talebi pending değilse (zaten approved veya rejected)
    if (registrationRequest.status !== 'pending') {
      return errorResponse(res, {
        message: `Kayıt talebiniz "${registrationRequest.status}" durumunda. Bildirim gönderilemez.`,
        statusCode: 400
      });
    }

    // Rate limiting: Son bildirim zamanını kontrol et (1 saatte 1 kez)
    const lastNotificationField = 'lastAdminNotificationSent';
    const ONE_HOUR = 60 * 60 * 1000;

    if (registrationRequest[lastNotificationField]) {
      const timeSinceLastNotification = Date.now() - new Date(registrationRequest[lastNotificationField]).getTime();
      if (timeSinceLastNotification < ONE_HOUR) {
        const remainingMinutes = Math.ceil((ONE_HOUR - timeSinceLastNotification) / 60000);
        return errorResponse(res, {
          message: `Bildirim zaten gönderildi. ${remainingMinutes} dakika sonra tekrar deneyebilirsiniz.`,
          statusCode: 429
        });
      }
    }

    // Admin kullanıcıları bul (super_admin rolü)
    const superAdminRole = await Role.findOne({ name: 'super_admin' });
    if (!superAdminRole) {
      return errorResponse(res, { message: 'Admin rolü bulunamadı', statusCode: 500 });
    }

    const adminUsers = await User.find({
      role: superAdminRole._id,
      isActive: true
    }).select('email');

    if (adminUsers.length === 0) {
      return errorResponse(res, {
        message: 'Aktif admin bulunamadı. Lütfen daha sonra tekrar deneyin.',
        statusCode: 503
      });
    }

    // Tüm admin'lere sistem içi bildirim oluştur
    const notificationPromises = adminUsers.map(async admin => {
      try {
        const notification = new Notification({
          recipient: admin._id,
          recipientType: 'super_admin',
          company: null, // System-wide notification
          title: 'Yeni Kayıt Onay Talebi',
          body: `${registrationRequest.fullName} (${registrationRequest.companyName}) kayıt onayı bekliyor. Kullanıcı bildirim gönderdi.`,
          type: 'SYSTEM',
          relatedModel: 'RegistrationRequest',
          relatedId: registrationRequest._id,
          data: {
            fullName: registrationRequest.fullName,
            email: user.email,
            phone: registrationRequest.phone,
            companyName: registrationRequest.companyName,
            referralCode: registrationRequest.referralCode,
            createdAt: registrationRequest.createdAt,
          },
          isRead: false,
          readAt: null,
        });
        await notification.save();
      } catch (err) {
        console.error(`Bildirim oluşturma hatası (${admin.email}):`, err);
      }
    });

    await Promise.allSettled(notificationPromises);

    // Son bildirim zamanını kaydet
    registrationRequest[lastNotificationField] = new Date();
    await registrationRequest.save();

    return successResponse(res, {
      message: 'Admin\'e bildirim gönderildi. En kısa sürede talebiniz incelenecektir.',
      data: {
        notifiedAdmins: adminUsers.length
      }
    });
  } catch (error) {
    console.error('Admin bildirim hatası:', error);
    return serverError(res, error);
  }
});

module.exports = router;
