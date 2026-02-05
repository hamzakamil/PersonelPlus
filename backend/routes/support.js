const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const SupportReply = require('../models/SupportReply');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

/**
 * POST /api/support - Yeni destek talebi oluştur
 */
router.post(
  '/',
  auth,
  requireRole('company_admin', 'bayi_admin', 'resmi_muhasebe_ik'),
  async (req, res) => {
    try {
      const { category, priority, subject, description } = req.body;

      if (!category || !subject || !description) {
        return errorResponse(res, { message: 'Kategori, konu ve açıklama zorunludur' });
      }

      const ticketData = {
        submittedBy: req.user._id,
        submitterRole: req.user.role.name,
        category,
        priority: priority || 'MEDIUM',
        subject,
        description,
      };

      // Kullanıcının company/dealer bilgisini ekle
      if (req.user.company) {
        ticketData.company = req.user.company._id || req.user.company;
      }
      if (req.user.dealer) {
        ticketData.dealer = req.user.dealer._id || req.user.dealer;
      }

      const ticket = new SupportTicket(ticketData);
      await ticket.save();

      const populatedTicket = await SupportTicket.findById(ticket._id)
        .populate('submittedBy', 'email')
        .populate('company', 'name')
        .populate('dealer', 'name');

      res.status(201).json({
        success: true,
        message: 'Destek talebi oluşturuldu',
        data: populatedTicket,
      });
    } catch (error) {
      console.error('Support ticket creation error:', error);
      return serverError(res, error, 'Talep oluşturma başarısız');
    }
  }
);

/**
 * GET /api/support - Destek taleplerini listele
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 20 } = req.query;
    let query = { isDeleted: false };

    // Rol bazlı filtreleme
    if (req.user.role.name === 'company_admin') {
      query.company = req.user.company;
    } else if (['bayi_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      query.dealer = req.user.dealer;
    }
    // super_admin için filtreleme yok (tümünü görebilir)

    // Filtreler
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const tickets = await SupportTicket.find(query)
      .populate('submittedBy', 'email')
      .populate('company', 'name')
      .populate('dealer', 'name')
      .populate('assignedTo', 'email')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SupportTicket.countDocuments(query);

    res.json({
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Support tickets list error:', error);
    return serverError(res, error, 'Talep listesi alınamadı');
  }
});

/**
 * GET /api/support/stats - İstatistikler
 */
router.get('/stats', auth, async (req, res) => {
  try {
    let query = { isDeleted: false };

    // Rol bazlı filtreleme
    if (req.user.role.name === 'company_admin') {
      query.company = req.user.company;
    } else if (['bayi_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      query.dealer = req.user.dealer;
    }

    const [totalCount, openCount, inProgressCount, resolvedCount, closedCount] = await Promise.all([
      SupportTicket.countDocuments(query),
      SupportTicket.countDocuments({ ...query, status: 'OPEN' }),
      SupportTicket.countDocuments({ ...query, status: 'IN_PROGRESS' }),
      SupportTicket.countDocuments({ ...query, status: 'RESOLVED' }),
      SupportTicket.countDocuments({ ...query, status: 'CLOSED' }),
    ]);

    res.json({
      total: totalCount,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
      closed: closedCount,
    });
  } catch (error) {
    console.error('Support stats error:', error);
    return serverError(res, error, 'İstatistikler alınamadı');
  }
});

/**
 * GET /api/support/:id - Talep detayı
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('submittedBy', 'email')
      .populate('company', 'name')
      .populate('dealer', 'name')
      .populate('assignedTo', 'email');

    if (!ticket) {
      return notFound(res, 'Talep bulunamadı');
    }

    // Yetki kontrolü
    const userCompanyId = req.user.company?._id?.toString() || req.user.company?.toString();
    const userDealerId = req.user.dealer?._id?.toString() || req.user.dealer?.toString();
    const canView =
      req.user.role.name === 'super_admin' ||
      (ticket.company && ticket.company._id.toString() === userCompanyId) ||
      (ticket.dealer && ticket.dealer._id.toString() === userDealerId);

    if (!canView) {
      return forbidden(res, 'Bu talebi görüntüleme yetkiniz yok');
    }

    // Yanıtları da getir
    const replies = await SupportReply.find({ ticket: req.params.id, isDeleted: false })
      .populate('repliedBy', 'email')
      .sort({ createdAt: 1 });

    res.json({ ticket, replies });
  } catch (error) {
    console.error('Support ticket detail error:', error);
    return serverError(res, error, 'Talep detayı alınamadı');
  }
});

/**
 * PUT /api/support/:id - Talep güncelle (sadece super_admin)
 */
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { status, priority, assignedTo, adminNotes } = req.body;

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return notFound(res, 'Talep bulunamadı');
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;

    if (status === 'RESOLVED' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    if (status === 'CLOSED' && !ticket.closedAt) {
      ticket.closedAt = new Date();
    }

    await ticket.save();

    const updatedTicket = await SupportTicket.findById(ticket._id)
      .populate('submittedBy', 'email')
      .populate('company', 'name')
      .populate('dealer', 'name')
      .populate('assignedTo', 'email');

    res.json({
      success: true,
      message: 'Talep güncellendi',
      data: updatedTicket,
    });
  } catch (error) {
    console.error('Support ticket update error:', error);
    return serverError(res, error, 'Talep güncellenemedi');
  }
});

/**
 * POST /api/support/:id/reply - Yanıt ekle
 */
router.post('/:id/reply', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return errorResponse(res, { message: 'Yanıt metni zorunludur' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return notFound(res, 'Talep bulunamadı');
    }

    // Yetki kontrolü
    const canReply =
      req.user.role.name === 'super_admin' ||
      (ticket.company && ticket.company.toString() === req.user.company?.toString()) ||
      (ticket.dealer && ticket.dealer.toString() === req.user.dealer?.toString());

    if (!canReply) {
      return forbidden(res, 'Bu talebe yanıt verme yetkiniz yok');
    }

    const reply = new SupportReply({
      ticket: req.params.id,
      repliedBy: req.user._id,
      replierRole: req.user.role.name,
      message: message.trim(),
      isAdminReply: req.user.role.name === 'super_admin',
    });

    await reply.save();

    // Talep durumunu güncelle (eğer açıksa "işlemde" yap)
    if (ticket.status === 'OPEN' && req.user.role.name === 'super_admin') {
      ticket.status = 'IN_PROGRESS';
      await ticket.save();
    }

    const populatedReply = await SupportReply.findById(reply._id).populate('repliedBy', 'email');

    res.status(201).json({
      success: true,
      message: 'Yanıt eklendi',
      data: populatedReply,
    });
  } catch (error) {
    console.error('Support reply error:', error);
    return serverError(res, error, 'Yanıt eklenemedi');
  }
});

/**
 * DELETE /api/support/:id - Talep sil (soft delete)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return notFound(res, 'Talep bulunamadı');
    }

    // Sadece talep sahibi veya super_admin silebilir
    const canDelete =
      req.user.role.name === 'super_admin' ||
      ticket.submittedBy.toString() === req.user._id.toString();

    if (!canDelete) {
      return forbidden(res, 'Bu talebi silme yetkiniz yok');
    }

    ticket.isDeleted = true;
    await ticket.save();

    res.json({ success: true, message: 'Talep silindi' });
  } catch (error) {
    console.error('Support ticket delete error:', error);
    return serverError(res, error, 'Talep silinemedi');
  }
});

module.exports = router;
