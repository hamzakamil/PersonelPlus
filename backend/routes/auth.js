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
const { auth } = require('../middleware/auth');
const { successResponse, errorResponse, serverError } = require('../utils/responseHelper');
const { sendRegistrationVerificationEmail } = require('../services/emailService');

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

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string') {
      return errorResponse(res, { message: 'Email adresi gereklidir' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .populate('role')
      .populate('dealer')
      .populate('company');

    if (!user) {
      return errorResponse(res, { message: 'Email veya şifre hatalı', statusCode: 401 });
    }

    if (!user.isActive) {
      return errorResponse(res, { message: 'Hesabınız aktif değil', statusCode: 401 });
    }

    // Employee rolü için işten çıkış tarihi kontrolü
    if (user.role.name === 'employee' && user.company) {
      const Employee = require('../models/Employee');
      const employee = await Employee.findOne({
        email: email.toLowerCase().trim(),
        company: user.company,
      });

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

    // Employee role: İlk girişte şifre kontrolü yapma (sadece email ile giriş)
    if (user.role.name === 'employee') {
      // Eğer şifre yoksa veya mustChangePassword true ise, şifre kontrolü yapma
      if (!user.password || user.mustChangePassword) {
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const userPayload = {
          id: user._id,
          email: user.email,
          role: user.role.name,
          dealer: user.dealer,
          company: user.company,
          mustChangePassword: true,
        };
        if (user.company) {
          const Employee = require('../models/Employee');
          const emp = await Employee.findOne({
            email: user.email.toLowerCase().trim(),
            company: user.company._id || user.company,
          }).select('firstName lastName');
          if (emp) userPayload.employeeName = `${emp.firstName} ${emp.lastName}`.trim();
        }
        return successResponse(res, {
          data: { token, user: userPayload, requiresPasswordSetup: true },
          message: 'Giriş başarılı, şifre belirlenmesi gerekiyor',
        });
      }
    }

    // Normal giriş: Şifre kontrolü yap
    if (!password) {
      return errorResponse(res, { message: 'Şifre gereklidir', statusCode: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, { message: 'Email veya şifre hatalı', statusCode: 401 });
    }

    // If company_admin, activate company on first login
    if (user.role.name === 'company_admin' && user.company) {
      const company = await Company.findById(user.company);
      if (company && !company.isActivated) {
        company.isActivated = true;
        company.activatedAt = new Date();
        await company.save();
      }
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const userPayload = {
      id: user._id,
      email: user.email,
      role: user.role.name,
      dealer: user.dealer,
      company: user.company,
      mustChangePassword: user.mustChangePassword,
    };
    if (user.role.name === 'employee' && user.company) {
      const Employee = require('../models/Employee');
      const emp = await Employee.findOne({
        email: user.email.toLowerCase().trim(),
        company: user.company._id || user.company,
      }).select('firstName lastName');
      if (emp) userPayload.employeeName = `${emp.firstName} ${emp.lastName}`.trim();
    }
    return successResponse(res, {
      data: { token, user: userPayload },
      message: 'Giriş başarılı',
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
      const Employee = require('../models/Employee');
      const employee = await Employee.findOne({
        email: user.email.toLowerCase().trim(),
        company: user.company._id || user.company,
      }).select('firstName lastName');
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
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return errorResponse(res, { message: 'Yeni şifre gereklidir' });
    }

    if (newPassword.length < 6) {
      return errorResponse(res, { message: 'Yeni şifre en az 6 karakter olmalıdır' });
    }

    const user = await User.findById(req.user._id);

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
    user.mustChangePassword = false; // Şifre değiştirildi, artık zorunlu değil
    await user.save();

    // If employee, also activate the employee record
    if (user.role.name === 'employee') {
      const Employee = require('../models/Employee');
      const employee = await Employee.findOne({ email: user.email });
      if (employee && !employee.isActivated) {
        employee.isActivated = true;
        employee.activatedAt = new Date();
        await employee.save();
      }
    }

    return successResponse(res, { message: 'Şifre başarıyla belirlendi' });
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

module.exports = router;
