const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const EmploymentPreRecord = require('../models/EmploymentPreRecord');
const Company = require('../models/Company');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

/**
 * GET /api/messages/unread-count - Okunmamış mesaj sayısı (bildirim için)
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    let query = { isRead: false, isDeleted: false };

    // Rol bazlı filtreleme
    if (req.user.role.name === 'company_admin') {
      query.recipientCompany = req.user.company;
    } else if (['bayi_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      query.recipientDealer = req.user.dealer;
    } else if (req.user.role.name === 'super_admin') {
      // Super admin tüm mesajları görebilir
      query.$or = [
        { recipientDealer: { $exists: true } },
        { recipientCompany: { $exists: true } }
      ];
    } else if (req.user.role.name === 'employee') {
      // Çalışanlar sadece kendilerine gönderilen mesajları görebilir
      if (!req.user.employee) {
        return res.json({ count: 0 });
      }
      const employeeId = req.user.employee?._id || req.user.employee;
      query.recipientEmployee = employeeId;
    } else {
      return res.json({ count: 0 });
    }

    const count = await Message.countDocuments(query);

    res.json({ count });
  } catch (error) {
    console.error('Okunmamış mesaj sayısı hatası:', error);
    return serverError(res, error);
  }
});

/**
 * GET /api/messages - Mesajları listele (gelen/giden)
 */
router.get('/', auth, async (req, res) => {
  try {
    const { type, direction, isRead, page = 1, limit = 20 } = req.query;
    let query = { isDeleted: false };

    // Çalışan için employee ID'sini al
    const employeeId = req.user.employee?._id || req.user.employee;

    // Gelen veya Giden filtreleme
    if (direction === 'inbox') {
      // Gelen mesajlar
      if (req.user.role.name === 'company_admin') {
        query.recipientCompany = req.user.company;
      } else if (['bayi_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
        query.recipientDealer = req.user.dealer;
      } else if (req.user.role.name === 'super_admin') {
        // Super admin için özel durum
      } else if (req.user.role.name === 'employee') {
        // Çalışanlar sadece kendilerine gönderilen mesajları görebilir
        if (!employeeId) {
          return res.json({ messages: [], pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 } });
        }
        query.recipientEmployee = employeeId;
      }
    } else if (direction === 'sent') {
      // Gönderilen mesajlar
      query.sender = req.user._id;
    } else {
      // Tümü (gelen + giden)
      if (req.user.role.name === 'company_admin') {
        query.$or = [
          { recipientCompany: req.user.company },
          { sender: req.user._id }
        ];
      } else if (['bayi_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
        query.$or = [
          { recipientDealer: req.user.dealer },
          { sender: req.user._id }
        ];
      } else if (req.user.role.name === 'super_admin') {
        // Super admin tümünü görür
      } else if (req.user.role.name === 'employee') {
        // Çalışanlar sadece kendilerine gönderilen mesajları görebilir
        if (!employeeId) {
          return res.json({ messages: [], pagination: { page: 1, limit: parseInt(limit), total: 0, pages: 0 } });
        }
        query.recipientEmployee = employeeId;
      }
    }

    // Okunma durumu filtresi
    if (isRead === 'true') {
      query.isRead = true;
    } else if (isRead === 'false') {
      query.isRead = false;
    }

    // Tip filtresi
    if (type) {
      query.type = type;
    }

    // Sadece ana mesajları getir (yanıtları değil)
    query.parentMessage = null;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find(query)
      .populate('sender', 'email')
      .populate('recipientCompany', 'name')
      .populate('recipientDealer', 'name')
      .populate('recipientEmployee', 'firstName lastName')
      .populate('relatedRequest', 'processType candidateFullName tcKimlikNo status')
      .populate({
        path: 'relatedRequest',
        populate: [
          { path: 'companyId', select: 'name' },
          { path: 'employeeId', select: 'firstName lastName' }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments(query);

    res.json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Mesaj listesi hatası:', error);
    return serverError(res, error);
  }
});

/**
 * GET /api/messages/request/:requestId - Belirli bir talebe ait mesajlar
 */
router.get('/request/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Talebi kontrol et
    const request = await EmploymentPreRecord.findById(requestId)
      .populate('companyId');

    if (!request) {
      return notFound(res, 'Talep bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name === 'company_admin') {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (userCompanyId.toString() !== request.companyId._id.toString()) {
        return forbidden(res);
      }
    } else if (['bayi_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const companyDealerId = request.companyId.dealer?._id || request.companyId.dealer;
      const userDealerId = req.user.dealer?._id || req.user.dealer;
      if (companyDealerId?.toString() !== userDealerId?.toString()) {
        return forbidden(res);
      }
    }

    const messages = await Message.find({
      relatedRequest: requestId,
      isDeleted: false
    })
      .populate('sender', 'email')
      .populate('readBy', 'email')
      .sort({ createdAt: 1 }); // Eskiden yeniye

    res.json({ messages, request });
  } catch (error) {
    console.error('Talep mesajları hatası:', error);
    return serverError(res, error);
  }
});

/**
 * GET /api/messages/:id - Mesaj detayı
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'email')
      .populate('recipientCompany', 'name')
      .populate('recipientDealer', 'name')
      .populate('recipientEmployee', 'firstName lastName')
      .populate('readBy', 'email')
      .populate({
        path: 'relatedRequest',
        populate: [
          { path: 'companyId', select: 'name' },
          { path: 'employeeId', select: 'firstName lastName' },
          { path: 'workplaceId', select: 'name' }
        ]
      })
      .populate('parentMessage');

    if (!message) {
      return notFound(res, 'Mesaj bulunamadı');
    }

    // Yanıtları da getir
    const replies = await Message.find({
      parentMessage: message._id,
      isDeleted: false
    })
      .populate('sender', 'email')
      .sort({ createdAt: 1 });

    res.json({ message, replies });
  } catch (error) {
    console.error('Mesaj detay hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/messages - Yeni mesaj gönder
 */
router.post('/', auth, requireRole('super_admin', 'bayi_admin', 'resmi_muhasebe_ik', 'company_admin'), async (req, res) => {
  try {
    const {
      relatedRequestId,
      recipientCompanyId,
      recipientDealerId,
      recipientEmployeeId,
      recipientEmail,
      subject,
      content,
      type = 'GENERAL'
    } = req.body;

    // Validasyon
    if (!subject || !content) {
      return errorResponse(res, { message: 'Konu ve içerik zorunludur' });
    }

    let recipientCompany = null;
    let recipientDealer = null;
    let recipientEmployee = null;
    let relatedRequest = null;

    // İlgili talep varsa
    if (relatedRequestId) {
      relatedRequest = await EmploymentPreRecord.findById(relatedRequestId)
        .populate({
          path: 'companyId',
          populate: { path: 'dealer' }
        });

      if (!relatedRequest) {
        return notFound(res, 'İlgili talep bulunamadı');
      }

      // Mesaj yönünü belirle
      if (['bayi_admin', 'resmi_muhasebe_ik', 'super_admin'].includes(req.user.role.name)) {
        // Bayi/Admin şirkete mesaj gönderiyor
        recipientCompany = relatedRequest.companyId._id;
      } else if (req.user.role.name === 'company_admin') {
        // Şirket bayiye mesaj gönderiyor
        recipientDealer = relatedRequest.companyId.dealer?._id || relatedRequest.companyId.dealer;
      }
    } else if (recipientEmail) {
      // Email ile alıcı bulma
      const recipientUser = await User.findOne({ email: recipientEmail.toLowerCase().trim() })
        .populate('company')
        .populate('dealer')
        .populate('role');

      if (!recipientUser) {
        return notFound(res, 'Alıcı bulunamadı');
      }

      // Super admin'lere direkt mesaj gönderilemez
      if (recipientUser.role?.name === 'super_admin') {
        return errorResponse(res, {
          message: 'Sistem yöneticilerine direkt mesaj gönderilemez. Lütfen destek sistemi üzerinden iletişime geçin.'
        });
      }

      // Alıcının company veya dealer bilgisini al
      if (recipientUser.company) {
        recipientCompany = recipientUser.company._id || recipientUser.company;
      }
      if (recipientUser.dealer) {
        recipientDealer = recipientUser.dealer._id || recipientUser.dealer;
      }
    } else {
      // Manuel alıcı belirleme
      if (recipientCompanyId) {
        recipientCompany = recipientCompanyId;
      }
      if (recipientDealerId) {
        recipientDealer = recipientDealerId;
      }
      if (recipientEmployeeId) {
        recipientEmployee = recipientEmployeeId;
      }
    }

    if (!recipientCompany && !recipientDealer && !recipientEmployee) {
      return errorResponse(res, { message: 'Alıcı belirtilmelidir' });
    }

    const message = new Message({
      type,
      relatedRequest: relatedRequestId || null,
      sender: req.user._id,
      senderRole: req.user.role.name,
      recipientCompany,
      recipientDealer,
      recipientEmployee,
      subject,
      content
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'email')
      .populate('recipientCompany', 'name')
      .populate('recipientDealer', 'name')
      .populate('recipientEmployee', 'firstName lastName')
      .populate('relatedRequest', 'processType candidateFullName status');

    res.status(201).json({
      success: true,
      message: 'Mesaj gönderildi',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Mesaj gönderme hatası:', error);
    return serverError(res, error);
  }
});

/**
 * POST /api/messages/:id/reply - Mesaja yanıt ver
 */
router.post('/:id/reply', auth, requireRole('super_admin', 'bayi_admin', 'resmi_muhasebe_ik', 'company_admin'), async (req, res) => {
  try {
    const { content } = req.body;
    const parentMessageId = req.params.id;

    if (!content) {
      return errorResponse(res, { message: 'İçerik zorunludur' });
    }

    const parentMessage = await Message.findById(parentMessageId);
    if (!parentMessage) {
      return notFound(res, 'Mesaj bulunamadı');
    }

    // Yanıt alıcısını belirle (göndericiye yanıt)
    let recipientCompany = null;
    let recipientDealer = null;

    // Yanıtı gönderenin rolüne göre alıcıyı belirle
    if (['bayi_admin', 'resmi_muhasebe_ik', 'super_admin'].includes(req.user.role.name)) {
      recipientCompany = parentMessage.recipientCompany || parentMessage.sender;
    } else if (req.user.role.name === 'company_admin') {
      recipientDealer = parentMessage.recipientDealer || parentMessage.sender;
    }

    const reply = new Message({
      type: parentMessage.type,
      relatedRequest: parentMessage.relatedRequest,
      sender: req.user._id,
      senderRole: req.user.role.name,
      recipientCompany: parentMessage.senderRole === 'company_admin' ? parentMessage.sender : recipientCompany,
      recipientDealer: ['bayi_admin', 'resmi_muhasebe_ik'].includes(parentMessage.senderRole) ? req.user.dealer : recipientDealer,
      subject: `RE: ${parentMessage.subject}`,
      content,
      parentMessage: parentMessageId
    });

    await reply.save();

    const populatedReply = await Message.findById(reply._id)
      .populate('sender', 'email')
      .populate('recipientCompany', 'name')
      .populate('recipientDealer', 'name')
      .populate('recipientEmployee', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Yanıt gönderildi',
      data: populatedReply
    });
  } catch (error) {
    console.error('Yanıt gönderme hatası:', error);
    return serverError(res, error);
  }
});

/**
 * PUT /api/messages/:id/read - Mesajı okundu olarak işaretle
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return notFound(res, 'Mesaj bulunamadı');
    }

    // Yetki kontrolü - sadece alıcı okuyabilir
    const userCompanyId = req.user.company?._id || req.user.company;
    const userDealerId = req.user.dealer?._id || req.user.dealer;
    const userEmployeeId = req.user.employee?._id || req.user.employee;

    const canRead =
      (message.recipientCompany && message.recipientCompany.toString() === userCompanyId?.toString()) ||
      (message.recipientDealer && message.recipientDealer.toString() === userDealerId?.toString()) ||
      (message.recipientEmployee && message.recipientEmployee.toString() === userEmployeeId?.toString()) ||
      req.user.role.name === 'super_admin';

    if (!canRead) {
      return forbidden(res, 'Bu mesajı okuma yetkiniz yok');
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      message.readBy = req.user._id;
      await message.save();
    }

    res.json({ success: true, message: 'Mesaj okundu olarak işaretlendi' });
  } catch (error) {
    console.error('Mesaj okundu işaretleme hatası:', error);
    return serverError(res, error);
  }
});

/**
 * PUT /api/messages/read-all - Tüm mesajları okundu olarak işaretle
 */
router.put('/read-all', auth, async (req, res) => {
  try {
    let query = { isRead: false, isDeleted: false };

    if (req.user.role.name === 'company_admin') {
      query.recipientCompany = req.user.company;
    } else if (['bayi_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      query.recipientDealer = req.user.dealer;
    } else if (req.user.role.name === 'employee') {
      // Çalışanlar sadece kendilerine gelen mesajları okundu işaretleyebilir
      const employeeId = req.user.employee?._id || req.user.employee;
      if (!employeeId) {
        return forbidden(res);
      }
      query.recipientEmployee = employeeId;
    } else if (req.user.role.name !== 'super_admin') {
      return forbidden(res);
    }

    const result = await Message.updateMany(query, {
      $set: {
        isRead: true,
        readAt: new Date(),
        readBy: req.user._id
      }
    });

    res.json({
      success: true,
      message: `${result.modifiedCount} mesaj okundu olarak işaretlendi`
    });
  } catch (error) {
    console.error('Toplu okundu işaretleme hatası:', error);
    return serverError(res, error);
  }
});

/**
 * DELETE /api/messages/:id - Mesajı sil (soft delete)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return notFound(res, 'Mesaj bulunamadı');
    }

    // Sadece gönderen silebilir
    if (message.sender.toString() !== req.user._id.toString() && req.user.role.name !== 'super_admin') {
      return forbidden(res, 'Bu mesajı silme yetkiniz yok');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({ success: true, message: 'Mesaj silindi' });
  } catch (error) {
    console.error('Mesaj silme hatası:', error);
    return serverError(res, error);
  }
});

module.exports = router;
