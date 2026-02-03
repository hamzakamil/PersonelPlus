const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Dealer = require('../models/Dealer');
const { auth, requireRole } = require('../middleware/auth');
const invoiceXmlService = require('../services/invoiceXmlService');
const integratorService = require('../services/integrators');
const { errorResponse, notFound, serverError, successResponse: success } = require('../utils/responseHelper');

// ==================== SUPER ADMIN ROUTES ====================

// GET /api/invoices - Tüm faturaları listele (super_admin)
router.get('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      dealer,
      startDate,
      endDate,
      invoiceType,
      search
    } = req.query;

    let query = {};

    // Filtreler
    if (status) {
      query.gibStatus = status;
    }

    if (dealer) {
      query.dealer = dealer;
    }

    if (invoiceType) {
      query.invoiceTypeCode = invoiceType;
    }

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { uuid: new RegExp(search, 'i') },
        { 'accountingCustomerParty.party.partyName': new RegExp(search, 'i') }
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('dealer', 'name contactEmail')
      .populate('payment', 'amount status')
      .select('-xmlContent -gibResponse.responseXml')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    // İstatistikler
    const stats = await Invoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$gibStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$legalMonetaryTotal.payableAmount' }
        }
      }
    ]);

    return success(res, {
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: stats.reduce((acc, s) => {
        acc[s._id] = { count: s.count, totalAmount: s.totalAmount };
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Fatura listesi hatası:', error);
    return serverError(res, error, 'Faturalar yüklenirken bir hata oluştu');
  }
});

// GET /api/invoices/stats - Fatura istatistikleri (super_admin)
router.get('/stats', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.issueDate = {};
      if (startDate) dateFilter.issueDate.$gte = new Date(startDate);
      if (endDate) dateFilter.issueDate.$lte = new Date(endDate);
    }

    const stats = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$legalMonetaryTotal.payableAmount' },
          totalTax: { $sum: '$taxTotal.taxAmount' },
          draftCount: { $sum: { $cond: [{ $eq: ['$gibStatus', 'draft'] }, 1, 0] } },
          sentCount: { $sum: { $cond: [{ $eq: ['$gibStatus', 'sent'] }, 1, 0] } },
          acceptedCount: { $sum: { $cond: [{ $eq: ['$gibStatus', 'accepted'] }, 1, 0] } },
          rejectedCount: { $sum: { $cond: [{ $eq: ['$gibStatus', 'rejected'] }, 1, 0] } },
          cancelledCount: { $sum: { $cond: [{ $eq: ['$gibStatus', 'cancelled'] }, 1, 0] } }
        }
      }
    ]);

    // Aylık trend
    const monthlyStats = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$issueDate' },
            month: { $month: '$issueDate' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$legalMonetaryTotal.payableAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    return success(res, {
      summary: stats[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        totalTax: 0,
        draftCount: 0,
        sentCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        cancelledCount: 0
      },
      monthlyTrend: monthlyStats.reverse()
    });
  } catch (error) {
    console.error('Fatura istatistik hatası:', error);
    return serverError(res, error, 'İstatistikler yüklenirken bir hata oluştu');
  }
});

// GET /api/invoices/integrators - Mevcut entegratörleri listele
router.get('/integrators', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const integrators = integratorService.listIntegrators();
    return success(res, { integrators });
  } catch (error) {
    return serverError(res, error, 'Entegratörler listelenemedi');
  }
});

// POST /api/invoices/integrators/test - Entegratör bağlantı testi
router.post('/integrators/test', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { integrator: integratorName } = req.body;

    if (integratorName) {
      const integrator = integratorService.getIntegrator(integratorName, { testMode: true });
      const result = await integrator.testConnection();
      return success(res, { [integratorName]: result });
    }

    // Tüm entegratörleri test et
    const results = await integratorService.testAllIntegrators();
    return success(res, results);
  } catch (error) {
    return serverError(res, error, 'Entegratör testi başarısız');
  }
});

// POST /api/invoices/check-taxpayer - Mükellef sorgula
router.post('/check-taxpayer', auth, async (req, res) => {
  try {
    const { taxNumber } = req.body;

    if (!taxNumber) {
      return errorResponse(res, { message: 'Vergi/TC Kimlik numarası zorunludur' });
    }

    const result = await integratorService.checkTaxpayer(taxNumber);

    return success(res, result);
  } catch (error) {
    return serverError(res, error, 'Mükellef sorgulanamadı');
  }
});

// ==================== BAYİ ROUTES ====================

// GET /api/invoices/my - Bayi kendi faturalarını listele
router.get('/my', auth, requireRole('bayi_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    let query = { dealer: req.user.dealer };

    if (status) {
      query.gibStatus = status;
    }

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('payment', 'amount status')
      .select('-xmlContent -gibResponse.responseXml')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    return success(res, {
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Bayi fatura listesi hatası:', error);
    return serverError(res, error, 'Faturalar yüklenirken bir hata oluştu');
  }
});

// ==================== GENEL ROUTES ====================

// GET /api/invoices/:id - Fatura detayı
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('dealer', 'name contactEmail taxNumber taxOffice')
      .populate('payment', 'amount status iyzicoPaymentId')
      .populate('createdBy', 'email');

    if (!invoice) {
      return notFound(res, 'Fatura bulunamadı');
    }

    // Yetki kontrolü
    const isSuperAdmin = req.user.role === 'super_admin';
    const isOwner = invoice.dealer && invoice.dealer._id.toString() === req.user.dealer?.toString();

    if (!isSuperAdmin && !isOwner) {
      return errorResponse(res, { message: 'Bu faturayı görüntüleme yetkiniz yok' }, 403);
    }

    return success(res, invoice);
  } catch (error) {
    console.error('Fatura detay hatası:', error);
    return serverError(res, error, 'Fatura yüklenirken bir hata oluştu');
  }
});

// POST /api/invoices - Yeni fatura oluştur (super_admin)
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const invoiceData = req.body;
    invoiceData.createdBy = req.user._id;

    const invoice = await invoiceXmlService.createInvoice(invoiceData);

    return success(res, invoice, 'Fatura oluşturuldu');
  } catch (error) {
    console.error('Fatura oluşturma hatası:', error);
    return serverError(res, error, 'Fatura oluşturulurken bir hata oluştu');
  }
});

// POST /api/invoices/:id/send - Faturayı GİB'e gönder
router.post('/:id/send', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return notFound(res, 'Fatura bulunamadı');
    }

    if (invoice.gibStatus !== 'draft') {
      return errorResponse(res, { message: 'Sadece taslak faturalar gönderilebilir' });
    }

    // XML yoksa oluştur
    if (!invoice.xmlContent) {
      await invoiceXmlService.regenerateXml(invoice._id);
      await invoice.reload();
    }

    // Entegratöre gönder
    const result = await integratorService.sendInvoice(invoice, invoice.xmlContent);

    if (result.success) {
      invoice.gibStatus = 'sent';
      invoice.integrator = {
        name: integratorService.getDefaultIntegrator().name,
        sentAt: new Date(),
        sentBy: req.user._id,
        response: {
          status: 'sent',
          ettn: result.ettn,
          message: result.message
        }
      };

      if (result.ettn) {
        invoice.gibResponse.ettn = result.ettn;
      }

      await invoice.save();

      return success(res, {
        invoice,
        integrator: result
      }, 'Fatura başarıyla gönderildi');
    }

    return errorResponse(res, { message: result.message || 'Fatura gönderilemedi' });
  } catch (error) {
    console.error('Fatura gönderim hatası:', error);
    return serverError(res, error, 'Fatura gönderilirken bir hata oluştu');
  }
});

// POST /api/invoices/:id/check-status - Fatura durumunu sorgula
router.post('/:id/check-status', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return notFound(res, 'Fatura bulunamadı');
    }

    // Yetki kontrolü
    const isSuperAdmin = req.user.role === 'super_admin';
    const isOwner = invoice.dealer && invoice.dealer.toString() === req.user.dealer?.toString();

    if (!isSuperAdmin && !isOwner) {
      return errorResponse(res, { message: 'Bu işlemi yapma yetkiniz yok' }, 403);
    }

    if (invoice.gibStatus === 'draft') {
      return errorResponse(res, { message: 'Taslak fatura durumu sorgulanamaz' });
    }

    const result = await integratorService.getInvoiceStatus(invoice.uuid);

    if (result.success) {
      // GİB yanıtını güncelle
      invoice.gibResponse = {
        ...invoice.gibResponse,
        status: result.status,
        statusCode: result.statusCode,
        statusDescription: result.statusDescription,
        receivedAt: new Date()
      };

      // Durumu güncelle
      if (result.status === 'accepted') {
        invoice.gibStatus = 'accepted';
      } else if (result.status === 'rejected') {
        invoice.gibStatus = 'rejected';
      }

      await invoice.save();

      return success(res, {
        invoice,
        status: result
      });
    }

    return errorResponse(res, { message: result.message || 'Durum sorgulanamadı' });
  } catch (error) {
    console.error('Durum sorgulama hatası:', error);
    return serverError(res, error, 'Durum sorgulanırken bir hata oluştu');
  }
});

// POST /api/invoices/:id/cancel - Fatura iptal et
router.post('/:id/cancel', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return notFound(res, 'Fatura bulunamadı');
    }

    if (!reason) {
      return errorResponse(res, { message: 'İptal nedeni zorunludur' });
    }

    if (invoice.gibStatus === 'cancelled') {
      return errorResponse(res, { message: 'Fatura zaten iptal edilmiş' });
    }

    // GİB'de iptal et (gönderilmiş faturalar için)
    if (invoice.gibStatus === 'sent' || invoice.gibStatus === 'accepted') {
      const result = await integratorService.cancelInvoice(invoice.uuid, reason);

      if (!result.success) {
        return errorResponse(res, { message: result.message || 'Fatura iptal edilemedi' });
      }
    }

    // Veritabanında iptal et
    await invoice.cancel(req.user._id, reason);

    return success(res, invoice, 'Fatura iptal edildi');
  } catch (error) {
    console.error('Fatura iptal hatası:', error);
    return serverError(res, error, 'Fatura iptal edilirken bir hata oluştu');
  }
});

// GET /api/invoices/:id/xml - Fatura XML indir
router.get('/:id/xml', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return notFound(res, 'Fatura bulunamadı');
    }

    // Yetki kontrolü
    const isSuperAdmin = req.user.role === 'super_admin';
    const isOwner = invoice.dealer && invoice.dealer.toString() === req.user.dealer?.toString();

    if (!isSuperAdmin && !isOwner) {
      return errorResponse(res, { message: 'Bu faturayı indirme yetkiniz yok' }, 403);
    }

    // XML içeriği var mı?
    let xmlContent = invoice.xmlContent;

    if (!xmlContent) {
      // XML yoksa oluştur
      const updatedInvoice = await invoiceXmlService.regenerateXml(invoice._id);
      xmlContent = updatedInvoice.xmlContent;
    }

    // XML dosyası olarak gönder
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.xml"`);
    res.send(xmlContent);
  } catch (error) {
    console.error('XML indirme hatası:', error);
    return serverError(res, error, 'XML indirilirken bir hata oluştu');
  }
});

// GET /api/invoices/:id/pdf - Fatura PDF indir
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return notFound(res, 'Fatura bulunamadı');
    }

    // Yetki kontrolü
    const isSuperAdmin = req.user.role === 'super_admin';
    const isOwner = invoice.dealer && invoice.dealer.toString() === req.user.dealer?.toString();

    if (!isSuperAdmin && !isOwner) {
      return errorResponse(res, { message: 'Bu faturayı indirme yetkiniz yok' }, 403);
    }

    // Taslak faturalar için PDF yoktur
    if (invoice.gibStatus === 'draft') {
      return errorResponse(res, { message: 'Taslak faturanın PDF\'i mevcut değil. Önce GİB\'e gönderin.' });
    }

    // Entegratörden PDF indir
    const pdfBuffer = await integratorService.downloadPdf(invoice.uuid);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF indirme hatası:', error);
    return serverError(res, error, 'PDF indirilirken bir hata oluştu');
  }
});

// POST /api/invoices/:id/regenerate-xml - XML yeniden oluştur
router.post('/:id/regenerate-xml', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return notFound(res, 'Fatura bulunamadı');
    }

    if (invoice.gibStatus !== 'draft') {
      return errorResponse(res, { message: 'Sadece taslak faturaların XML\'i yeniden oluşturulabilir' });
    }

    const updatedInvoice = await invoiceXmlService.regenerateXml(invoice._id);

    return success(res, updatedInvoice, 'XML yeniden oluşturuldu');
  } catch (error) {
    console.error('XML oluşturma hatası:', error);
    return serverError(res, error, 'XML oluşturulurken bir hata oluştu');
  }
});

// PUT /api/invoices/:id - Fatura güncelle (sadece taslak)
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return notFound(res, 'Fatura bulunamadı');
    }

    if (invoice.gibStatus !== 'draft') {
      return errorResponse(res, { message: 'Sadece taslak faturalar güncellenebilir' });
    }

    const allowedUpdates = [
      'invoiceTypeCode',
      'profileId',
      'notes',
      'accountingSupplierParty',
      'accountingCustomerParty',
      'invoiceLines',
      'taxTotal',
      'legalMonetaryTotal'
    ];

    const updates = req.body;

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        invoice[field] = updates[field];
      }
    });

    // XML yeniden oluştur
    const xmlContent = require('../services/invoiceXmlService').generateInvoiceXml(invoice.toObject());
    invoice.xmlContent = xmlContent;
    invoice.xmlHash = require('crypto').createHash('sha256').update(xmlContent).digest('hex');

    await invoice.save();

    return success(res, invoice, 'Fatura güncellendi');
  } catch (error) {
    console.error('Fatura güncelleme hatası:', error);
    return serverError(res, error, 'Fatura güncellenirken bir hata oluştu');
  }
});

// DELETE /api/invoices/:id - Fatura sil (sadece taslak)
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return notFound(res, 'Fatura bulunamadı');
    }

    if (invoice.gibStatus !== 'draft') {
      return errorResponse(res, { message: 'Sadece taslak faturalar silinebilir' });
    }

    await Invoice.findByIdAndDelete(req.params.id);

    return success(res, null, 'Fatura silindi');
  } catch (error) {
    console.error('Fatura silme hatası:', error);
    return serverError(res, error, 'Fatura silinirken bir hata oluştu');
  }
});

// POST /api/invoices/bulk-send - Toplu fatura gönder
router.post('/bulk-send', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { invoiceIds } = req.body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return errorResponse(res, { message: 'Fatura ID listesi zorunludur' });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const invoiceId of invoiceIds) {
      try {
        const invoice = await Invoice.findById(invoiceId);

        if (!invoice) {
          results.failed.push({ id: invoiceId, reason: 'Fatura bulunamadı' });
          continue;
        }

        if (invoice.gibStatus !== 'draft') {
          results.failed.push({ id: invoiceId, reason: 'Fatura taslak değil' });
          continue;
        }

        // XML yoksa oluştur
        if (!invoice.xmlContent) {
          await invoiceXmlService.regenerateXml(invoice._id);
          await invoice.reload();
        }

        // Gönder
        const result = await integratorService.sendInvoice(invoice, invoice.xmlContent);

        if (result.success) {
          invoice.gibStatus = 'sent';
          invoice.integrator = {
            name: integratorService.getDefaultIntegrator().name,
            sentAt: new Date(),
            sentBy: req.user._id
          };

          if (result.ettn) {
            invoice.gibResponse.ettn = result.ettn;
          }

          await invoice.save();
          results.success.push({ id: invoiceId, invoiceNumber: invoice.invoiceNumber });
        } else {
          results.failed.push({ id: invoiceId, reason: result.message });
        }
      } catch (err) {
        results.failed.push({ id: invoiceId, reason: err.message });
      }
    }

    return success(res, results, `${results.success.length} fatura gönderildi, ${results.failed.length} başarısız`);
  } catch (error) {
    console.error('Toplu gönderim hatası:', error);
    return serverError(res, error, 'Toplu gönderim sırasında bir hata oluştu');
  }
});

module.exports = router;
