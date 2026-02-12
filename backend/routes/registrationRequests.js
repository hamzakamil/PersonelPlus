const express = require('express');
const router = express.Router();
const RegistrationRequest = require('../models/RegistrationRequest');
const User = require('../models/User');
const Dealer = require('../models/Dealer');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { successResponse, errorResponse, serverError } = require('../utils/responseHelper');

// GET /api/registration-requests - Tüm kayıt taleplerini listele
router.get('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await RegistrationRequest.countDocuments(filter);

    const requests = await RegistrationRequest.find(filter)
      .populate('user', 'email isActive')
      .populate('processedBy', 'email')
      .populate('dealer', 'name referralCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    return successResponse(res, {
      data: {
        requests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Kayıt talepleri getirme hatası:', error);
    return serverError(res, error);
  }
});

// GET /api/registration-requests/stats - Durum bazlı istatistikler
router.get('/stats', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const stats = await RegistrationRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result = { pending: 0, approved: 0, rejected: 0 };
    stats.forEach(s => {
      result[s._id] = s.count;
    });

    return successResponse(res, { data: result });
  } catch (error) {
    console.error('Kayıt istatistikleri hatası:', error);
    return serverError(res, error);
  }
});

// PUT /api/registration-requests/:id/approve - Kayıt talebini onayla
router.put('/:id/approve', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const request = await RegistrationRequest.findById(req.params.id).populate('user');

    if (!request) {
      return errorResponse(res, { message: 'Kayıt talebi bulunamadı', statusCode: 404 });
    }

    if (request.status !== 'pending') {
      return errorResponse(res, { message: 'Bu talep zaten işlenmiş', statusCode: 400 });
    }

    const user = await User.findById(request.user._id || request.user);
    if (!user) {
      return errorResponse(res, { message: 'Kullanıcı bulunamadı', statusCode: 404 });
    }

    // Bayi belirle: referans kodundan gelen bayi varsa onu kullan, yoksa varsayılan bayi
    let targetDealer;
    if (request.dealer) {
      targetDealer = await Dealer.findById(request.dealer);
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

    // Şirket oluştur (bayiye bağlı)
    const company = new Company({
      name: request.companyName,
      dealer: targetDealer._id,
      contactEmail: user.email,
      contactPhone: request.phone || '',
      authorizedPerson: {
        fullName: request.fullName,
        phone: request.phone || '',
        email: user.email,
      },
      isActive: true,
    });
    await company.save();

    // Kullanıcıyı aktive et ve bayi/şirket ata
    user.isActive = true;
    user.dealer = targetDealer._id;
    user.company = company._id;
    await user.save();

    // Talebi onayla
    request.status = 'approved';
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    await request.save();

    return successResponse(res, {
      message: 'Kayıt talebi onaylandı. Şirket oluşturuldu. Kullanıcı artık giriş yapabilir.',
      data: request,
    });
  } catch (error) {
    console.error('Kayıt onaylama hatası:', error);
    return serverError(res, error);
  }
});

// PUT /api/registration-requests/:id/reject - Kayıt talebini reddet
router.put('/:id/reject', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const request = await RegistrationRequest.findById(req.params.id);

    if (!request) {
      return errorResponse(res, { message: 'Kayıt talebi bulunamadı', statusCode: 404 });
    }

    if (request.status !== 'pending') {
      return errorResponse(res, { message: 'Bu talep zaten işlenmiş', statusCode: 400 });
    }

    // Talebi reddet
    request.status = 'rejected';
    request.rejectionReason = rejectionReason || '';
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    await request.save();

    return successResponse(res, {
      message: 'Kayıt talebi reddedildi.',
      data: request,
    });
  } catch (error) {
    console.error('Kayıt reddetme hatası:', error);
    return serverError(res, error);
  }
});

// DELETE /api/registration-requests/:id - Kayıt talebini ve ilişkili verileri sil
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const request = await RegistrationRequest.findById(req.params.id);

    if (!request) {
      return errorResponse(res, { message: 'Kayıt talebi bulunamadı', statusCode: 404 });
    }

    const userId = request.user;

    // Kullanıcıyı bul
    const user = await User.findById(userId);

    if (user) {
      // Kullanıcıya ait şirketi sil
      if (user.company) {
        await Company.findByIdAndDelete(user.company);
      }

      // Kullanıcıyı sil
      await User.findByIdAndDelete(userId);
    }

    // Kayıt talebini sil
    await RegistrationRequest.findByIdAndDelete(req.params.id);

    return successResponse(res, {
      message: 'Kayıt talebi ve ilişkili veriler silindi.',
    });
  } catch (error) {
    console.error('Kayıt talebi silme hatası:', error);
    return serverError(res, error);
  }
});

module.exports = router;
