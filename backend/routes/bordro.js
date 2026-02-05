const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const BordroUpload = require('../models/BordroUpload');
const Bordro = require('../models/Bordro');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const {
  successResponse,
  errorResponse,
  notFound,
  forbidden,
  serverError,
  createdResponse,
} = require('../utils/responseHelper');
const bordroService = require('../services/bordroService');
const emailService = require('../services/emailService');
const notificationService = require('../services/notificationService');
const bordroPdfService = require('../services/bordroPdfService');
const timestampService = require('../services/timestampService');
const smsService = require('../services/smsService');
const SmsVerification = require('../models/SmsVerification');
const { isEnabled: isTimestampEnabled } = require('../config/timestamp');

// Multer konfigürasyonu
const upload = multer({
  dest: 'uploads/bordro/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (mimetypes.includes(file.mimetype) || extname) {
      return cb(null, true);
    }
    cb(new Error('Sadece Excel dosyaları (.xlsx, .xls) yüklenebilir'));
  },
});

// ==================== BAYI ENDPOINT'LERİ ====================

/**
 * POST /api/bordro/upload
 * Excel dosyası yükle ve işle
 * Rol: bayi_admin
 */
router.post(
  '/upload',
  auth,
  requireRole('super_admin', 'bayi_admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return errorResponse(res, { message: 'Dosya yüklenmedi' });
      }

      const { company: companyId, year, month } = req.body;

      if (!companyId || !year || !month) {
        // Dosyayı sil
        if (req.file.path) fs.unlinkSync(req.file.path);
        return errorResponse(res, { message: 'Şirket, yıl ve ay zorunludur' });
      }

      // Şirket kontrolü
      const company = await Company.findById(companyId);
      if (!company) {
        if (req.file.path) fs.unlinkSync(req.file.path);
        return notFound(res, 'Şirket bulunamadı');
      }

      // Bayi yetkisi kontrolü
      if (req.user.role.name === 'bayi_admin') {
        const userDealerId = req.user.dealer?._id || req.user.dealer;
        if (company.dealer.toString() !== userDealerId.toString()) {
          if (req.file.path) fs.unlinkSync(req.file.path);
          return forbidden(res, 'Bu şirkete erişim yetkiniz yok');
        }
      }

      // Aynı dönem için mevcut bordro durumlarını kontrol et
      const existingBordros = await Bordro.find({
        company: companyId,
        year: parseInt(year),
        month: parseInt(month),
      });

      if (existingBordros.length > 0) {
        // Mevcut bordro durumlarını analiz et
        const statusCounts = {
          pending: existingBordros.filter(b => b.status === 'pending').length,
          company_approved: existingBordros.filter(b => b.status === 'company_approved').length,
          approved: existingBordros.filter(b => b.status === 'approved').length,
          rejected: existingBordros.filter(b => b.status === 'rejected').length,
        };

        const replaceExisting =
          req.body.replaceExisting === 'true' || req.body.replaceExisting === true;

        if (!replaceExisting) {
          // İlk yükleme girişimi - kullanıcıya durum bilgisi ver
          if (req.file.path) fs.unlinkSync(req.file.path);

          // Mevcut upload kaydını bul (tarih bilgisi için)
          const existingUpload = await BordroUpload.findOne({
            company: companyId,
            year: parseInt(year),
            month: parseInt(month),
          }).sort({ createdAt: -1 });

          return errorResponse(
            res,
            {
              message: `Bu dönem için zaten ${existingBordros.length} bordro mevcut`,
              code: 'DUPLICATE_UPLOAD',
              existingUpload: existingUpload
                ? {
                    uploadedAt: existingUpload.createdAt,
                    uploadedBy: existingUpload.uploadedBy,
                    stats: existingUpload.stats,
                  }
                : null,
              existingStats: {
                total: existingBordros.length,
                pending: statusCounts.pending,
                companyApproved: statusCounts.company_approved,
                approved: statusCounts.approved,
                rejected: statusCounts.rejected,
              },
              hint:
                statusCounts.rejected > 0
                  ? `${statusCounts.rejected} reddedilmiş bordro güncellenebilir. Onaylı bordrolar korunacaktır.`
                  : 'Reddedilmiş bordro yok. Sadece bekleyen bordrolar güncellenebilir.',
            },
            409
          ); // 409 Conflict
        }

        // replaceExisting=true: Güncelleme yapılacak
        // Ama onaylı bordrolar varsa uyarı ver
        if (
          statusCounts.approved > 0 &&
          statusCounts.rejected === 0 &&
          statusCounts.pending === 0 &&
          statusCounts.company_approved === 0
        ) {
          // Tüm bordrolar çalışan tarafından onaylanmış, güncellenecek bir şey yok
          if (req.file.path) fs.unlinkSync(req.file.path);
          return errorResponse(res, {
            message:
              'Bu dönemdeki tüm bordrolar çalışanlar tarafından onaylanmış. Güncellenecek bordro bulunmuyor.',
            code: 'ALL_APPROVED',
          });
        }

        // Eski upload'ları temizle (ama bordroları silme - bordroService smart update yapacak)
        const existingUpload = await BordroUpload.findOne({
          company: companyId,
          year: parseInt(year),
          month: parseInt(month),
        });
        if (existingUpload) {
          console.log(`Mevcut upload kaydı siliniyor: ${existingUpload._id}`);
          await BordroUpload.findByIdAndDelete(existingUpload._id);
        }
      }

      // Upload kaydı oluştur
      const bordroUpload = await BordroUpload.create({
        company: companyId,
        dealer: company.dealer,
        uploadedBy: req.user._id,
        year: parseInt(year),
        month: parseInt(month),
        originalFileName: req.file.originalname,
        filePath: req.file.path,
        status: 'processing',
      });

      // Excel'i işle
      const result = await bordroService.processExcelFile(
        req.file.path,
        companyId,
        bordroUpload._id,
        parseInt(year),
        parseInt(month)
      );

      // Upload kaydını güncelle
      bordroUpload.status =
        result.errors.length > 0 && result.successCount > 0
          ? 'partial'
          : result.errors.length > 0
            ? 'failed'
            : 'completed';
      bordroUpload.stats = {
        totalRows: result.totalRows,
        successCount: result.successCount,
        errorCount: result.errors.length,
        notifiedCount: 0,
        skippedApproved: result.skippedApproved || 0,
        skippedCompanyApproved: result.skippedCompanyApproved || 0,
        updatedRejected: result.updatedRejected || 0,
      };
      bordroUpload.errors = result.errors;
      bordroUpload.companyMetadata = result.companyMetadata;
      bordroUpload.processedAt = new Date();
      await bordroUpload.save();

      // Uyarı mesajı oluştur
      const parts = [];
      parts.push(`${result.successCount} bordro kaydedildi`);

      if (result.updatedRejected > 0) {
        parts.push(`${result.updatedRejected} reddedilmiş bordro güncellendi`);
      }
      if (result.skippedApproved > 0) {
        parts.push(`${result.skippedApproved} onaylı bordro korundu`);
      }
      if (result.skippedCompanyApproved > 0) {
        parts.push(`${result.skippedCompanyApproved} şirket onaylı bordro korundu`);
      }
      if (result.errors.length > 0) {
        parts.push(`${result.errors.length} hata`);
      }
      if (result.warnings && result.warnings.length > 0) {
        parts.push(`${result.warnings.length} uyarı`);
      }

      const message = parts.join(', ');

      return createdResponse(res, {
        data: {
          uploadId: bordroUpload._id,
          stats: bordroUpload.stats,
          errors: result.errors,
          warnings: result.warnings || [],
        },
        message,
      });
    } catch (error) {
      // Hata durumunda dosyayı temizle
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
      }
      console.error('Bordro yükleme hatası:', error);
      return serverError(res, error, 'Bordro yüklenirken hata oluştu');
    }
  }
);

/**
 * GET /api/bordro/uploads
 * Yükleme geçmişi
 * Rol: bayi_admin, super_admin
 */
router.get('/uploads', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    let query = {};

    if (req.user.role.name === 'bayi_admin') {
      const userDealerId = req.user.dealer?._id || req.user.dealer;
      query.dealer = userDealerId;
    }

    // Filtreler
    if (req.query.company) query.company = req.query.company;
    if (req.query.year) query.year = parseInt(req.query.year);
    if (req.query.month) query.month = parseInt(req.query.month);
    if (req.query.status) query.status = req.query.status;

    const uploads = await BordroUpload.find(query)
      .populate('company', 'name')
      .populate('uploadedBy', 'email')
      .sort({ createdAt: -1 })
      .limit(100);

    return successResponse(res, { data: uploads });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/bordro/uploads/:id
 * Yükleme detayı
 * Rol: bayi_admin, super_admin
 */
router.get('/uploads/:id', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const upload = await BordroUpload.findById(req.params.id)
      .populate('company', 'name')
      .populate('uploadedBy', 'email');

    if (!upload) {
      return notFound(res, 'Yükleme bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name === 'bayi_admin') {
      const userDealerId = req.user.dealer?._id || req.user.dealer;
      if (upload.dealer.toString() !== userDealerId.toString()) {
        return forbidden(res);
      }
    }

    // Bu upload'a ait bordroları getir
    const bordros = await Bordro.find({ upload: upload._id })
      .populate('employee', 'firstName lastName tcKimlik')
      .select('tcKimlik employeeName status payrollData.netUcret notifiedAt approvedAt rejectedAt');

    return successResponse(res, { data: { upload, bordros } });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * POST /api/bordro/uploads/:id/notify
 * Şirket yöneticisine onay için bildirim gönder
 * Rol: bayi_admin
 */
router.post(
  '/uploads/:id/notify',
  auth,
  requireRole('super_admin', 'bayi_admin'),
  async (req, res) => {
    try {
      const upload = await BordroUpload.findById(req.params.id).populate('company');

      if (!upload) {
        return notFound(res, 'Yükleme bulunamadı');
      }

      // Yetki kontrolü
      if (req.user.role.name === 'bayi_admin') {
        const userDealerId = req.user.dealer?._id || req.user.dealer;
        if (upload.dealer.toString() !== userDealerId.toString()) {
          return forbidden(res);
        }
      }

      // Pending bordro sayısı
      const pendingCount = await Bordro.countDocuments({
        upload: upload._id,
        status: 'pending',
      });

      if (pendingCount === 0) {
        return errorResponse(res, { message: 'Onay bekleyen bordro bulunamadı' });
      }

      // Şirket yöneticilerini bul
      const Role = require('../models/Role');
      const companyAdminRole = await Role.findOne({ name: 'company_admin' });

      const companyAdmins = await User.find({
        company: upload.company._id,
        role: companyAdminRole._id,
      });

      if (companyAdmins.length === 0) {
        return errorResponse(res, { message: 'Şirket yöneticisi bulunamadı' });
      }

      let notifiedCount = 0;

      for (const admin of companyAdmins) {
        try {
          // In-app bildirim gönder
          await notificationService.send({
            recipient: admin._id,
            recipientType: 'company_admin',
            company: upload.company._id,
            type: 'BORDRO_PENDING_APPROVAL',
            title: 'Bordro Onayı Bekliyor',
            body: `${bordroService.getMonthName(upload.month)} ${upload.year} dönemi için ${pendingCount} adet bordro onayınızı bekliyor.`,
            data: {
              uploadId: upload._id,
              year: upload.year,
              month: upload.month,
              count: pendingCount,
            },
            relatedModel: 'BordroUpload',
            relatedId: upload._id,
            priority: 'high',
          });

          notifiedCount++;
        } catch (err) {
          console.error('Bildirim gönderilemedi:', err);
        }
      }

      // Upload istatistiklerini güncelle
      upload.stats.notifiedCount = notifiedCount;
      upload.notificationsSentAt = new Date();
      await upload.save();

      return successResponse(res, {
        message: `${notifiedCount} şirket yöneticisine bildirim gönderildi`,
        notifiedCount,
        pendingCount,
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * GET /api/bordro/stats
 * Onay istatistikleri
 * Rol: bayi_admin, company_admin
 */
router.get(
  '/stats',
  auth,
  requireRole('super_admin', 'bayi_admin', 'company_admin'),
  async (req, res) => {
    try {
      let companyFilter = {};

      if (req.user.role.name === 'company_admin') {
        const userCompanyId = req.user.company?._id || req.user.company;
        companyFilter.company = userCompanyId;
      } else if (req.user.role.name === 'bayi_admin') {
        const companies = await Company.find({ dealer: req.user.dealer?._id || req.user.dealer });
        companyFilter.company = { $in: companies.map(c => c._id) };
      }

      // Yıl/ay filtresi
      if (req.query.year) companyFilter.year = parseInt(req.query.year);
      if (req.query.month) companyFilter.month = parseInt(req.query.month);
      if (req.query.company) companyFilter.company = req.query.company;

      const stats = await Bordro.aggregate([
        { $match: companyFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const result = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      stats.forEach(s => {
        if (result.hasOwnProperty(s._id)) {
          result[s._id] = s.count;
        }
        result.total += s.count;
      });

      return successResponse(res, { data: result });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * GET /api/bordro/company-list
 * Şirket admin için tüm çalışan bordroları listesi
 * Rol: company_admin, bayi_admin, super_admin
 */
router.get(
  '/company-list',
  auth,
  requireRole('super_admin', 'bayi_admin', 'company_admin'),
  async (req, res) => {
    try {
      let query = {};

      // Rol bazlı filtreleme
      if (req.user.role.name === 'company_admin') {
        const userCompanyId = req.user.company?._id || req.user.company;
        query.company = userCompanyId;
      } else if (req.user.role.name === 'bayi_admin') {
        const companies = await Company.find({ dealer: req.user.dealer?._id || req.user.dealer });
        query.company = { $in: companies.map(c => c._id) };
      }

      // Filtreler
      if (req.query.year) query.year = parseInt(req.query.year);
      if (req.query.month) query.month = parseInt(req.query.month);
      if (req.query.status) query.status = req.query.status;
      if (req.query.company && req.user.role.name !== 'company_admin') {
        query.company = req.query.company;
      }

      // Arama
      if (req.query.search) {
        const searchRegex = new RegExp(req.query.search, 'i');
        query.$or = [{ employeeName: searchRegex }, { tcKimlik: searchRegex }];
      }

      // Sıralama
      let sort = { createdAt: -1 };
      if (req.query.sortBy) {
        const order = req.query.sortOrder === 'asc' ? 1 : -1;
        switch (req.query.sortBy) {
          case 'employeeName':
            sort = { employeeName: order };
            break;
          case 'netUcret':
            sort = { 'payrollData.netUcret': order };
            break;
          case 'createdAt':
          default:
            sort = { createdAt: order };
        }
      }

      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      // Toplam sayı
      const total = await Bordro.countDocuments(query);

      // Bordroları getir
      const bordros = await Bordro.find(query)
        .populate('employee', 'firstName lastName tcKimlik')
        .populate('company', 'name')
        .select('-approvalCode -approvalCodeExpires -approvalCodeAttempts')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      // İstatistikler (filtrelere göre)
      const statsQuery = { ...query };
      delete statsQuery.$or; // Arama olmadan istatistik al
      delete statsQuery.status; // Durum olmadan istatistik al

      const statsAgg = await Bordro.aggregate([
        { $match: statsQuery },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = {
        total: 0,
        pending: 0,
        company_approved: 0,
        approved: 0,
        rejected: 0,
        totalNetAmount: 0,
      };

      statsAgg.forEach(s => {
        if (stats.hasOwnProperty(s._id)) {
          stats[s._id] = s.count;
        }
        stats.total += s.count;
      });

      // Toplam net tutar hesapla
      const totalNetAgg = await Bordro.aggregate([
        { $match: statsQuery },
        {
          $group: {
            _id: null,
            totalNet: { $sum: '$payrollData.netOdenen' },
          },
        },
      ]);

      if (totalNetAgg.length > 0) {
        stats.totalNetAmount = totalNetAgg[0].totalNet || 0;
      }

      return successResponse(res, {
        data: bordros,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          stats,
        },
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * GET /api/bordro/rejections
 * Reddedilen bordrolar
 * Rol: bayi_admin
 */
router.get(
  '/rejections',
  auth,
  requireRole('super_admin', 'bayi_admin', 'company_admin'),
  async (req, res) => {
    try {
      let query = { status: 'rejected' };

      if (req.user.role.name === 'bayi_admin') {
        const companies = await Company.find({ dealer: req.user.dealer?._id || req.user.dealer });
        query.company = { $in: companies.map(c => c._id) };
      }

      if (req.query.company) query.company = req.query.company;

      const rejections = await Bordro.find(query)
        .populate('employee', 'firstName lastName tcKimlik email')
        .populate('company', 'name')
        .sort({ rejectedAt: -1 })
        .limit(100);

      return successResponse(res, { data: rejections });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

// ==================== ŞİRKET YÖNETİCİSİ ONAY ENDPOINT'LERİ ====================

/**
 * GET /api/bordro/pending-approval
 * Şirket yöneticisinin onaylaması gereken bordrolar
 * Rol: company_admin
 */
router.get(
  '/pending-approval',
  auth,
  requireRole('company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'),
  async (req, res) => {
    try {
      const userCompanyId = req.user.company?._id || req.user.company;

      let query = {
        company: userCompanyId,
        status: 'pending',
      };

      // Filtreler
      if (req.query.year) query.year = parseInt(req.query.year);
      if (req.query.month) query.month = parseInt(req.query.month);
      if (req.query.upload) query.upload = req.query.upload;

      const bordros = await Bordro.find(query)
        .populate('employee', 'firstName lastName tcKimlik email')
        .populate('upload', 'originalFileName createdAt')
        .sort({ createdAt: -1 });

      // İstatistikler
      const companyId = req.user.company._id || req.user.company;
      const stats = await Bordro.aggregate([
        { $match: { company: companyId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const statusCounts = { pending: 0, company_approved: 0, approved: 0, rejected: 0 };
      stats.forEach(s => {
        statusCounts[s._id] = s.count;
      });

      // Sayfadaki bordroların toplam net tutarı
      const totalNetAmount = bordros.reduce((sum, b) => sum + (b.payrollData?.netOdenen || 0), 0);

      return successResponse(res, {
        data: bordros,
        meta: {
          totalPending: bordros.length,
          stats: statusCounts,
          totalNetAmount,
        },
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * POST /api/bordro/:id/company-approve
 * Şirket yöneticisi bordroyu onaylar ve çalışanlara gönderir
 * Rol: company_admin
 */
router.post(
  '/:id/company-approve',
  auth,
  requireRole('company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'),
  async (req, res) => {
    try {
      const { note } = req.body;

      const bordro = await Bordro.findById(req.params.id).populate(
        'employee',
        'firstName lastName email'
      );

      if (!bordro) {
        return notFound(res, 'Bordro bulunamadı');
      }

      // Şirket yetki kontrolü
      const userCompanyId = req.user.company?._id || req.user.company;
      if (bordro.company.toString() !== userCompanyId.toString()) {
        return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
      }

      // Zaten onaylanmış mı?
      if (bordro.status === 'company_approved' || bordro.status === 'approved') {
        return errorResponse(res, { message: 'Bu bordro zaten onaylanmış' });
      }

      // Şirket onayı ver (çalışan onayı bekleyecek)
      bordro.status = 'company_approved';
      bordro.companyApprovedBy = req.user._id;
      bordro.companyApprovedAt = new Date();
      bordro.companyApprovalNote = note || '';

      await bordro.save();

      // Çalışana bildirim gönder - bordroyu görüntüleyip onaylaması gerektiğini bildir
      try {
        const user = await User.findOne({ employee: bordro.employee._id });
        if (user) {
          await notificationService.send({
            recipient: user._id,
            recipientType: 'employee',
            company: bordro.company,
            type: 'BORDRO_PENDING_APPROVAL',
            title: 'Bordronuz Hazır',
            body: `${bordroService.getMonthName(bordro.month)} ${bordro.year} dönemi bordronuz hazırlandı. Lütfen kontrol edip onaylayın.`,
            data: { bordroId: bordro._id, year: bordro.year, month: bordro.month },
            relatedModel: 'Bordro',
            relatedId: bordro._id,
            priority: 'high',
          });
        }
      } catch (notifyError) {
        console.error('Bordro onay bildirimi gönderilemedi:', notifyError);
      }

      return successResponse(res, {
        companyApprovedAt: bordro.companyApprovedAt,
        bordroId: bordro._id,
        message: 'Bordro onaylandı ve çalışana gönderildi',
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * POST /api/bordro/bulk-approve
 * Toplu bordro onayı (şirket onayı)
 * Rol: company_admin
 */
router.post(
  '/bulk-approve',
  auth,
  requireRole('company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'),
  async (req, res) => {
    try {
      const { bordroIds, note } = req.body;

      if (!bordroIds || !Array.isArray(bordroIds) || bordroIds.length === 0) {
        return errorResponse(res, { message: 'Bordro ID listesi gereklidir' });
      }

      const userCompanyId = req.user.company?._id || req.user.company;

      // Sadece kendi şirketinin pending bordrolarını onayla
      const result = await Bordro.updateMany(
        {
          _id: { $in: bordroIds },
          company: userCompanyId,
          status: 'pending',
        },
        {
          $set: {
            status: 'company_approved',
            companyApprovedBy: req.user._id,
            companyApprovedAt: new Date(),
            companyApprovalNote: note || '',
          },
        }
      );

      // Onaylanan bordroların çalışanlarına bildirim gönder
      if (result.modifiedCount > 0) {
        const approvedBordros = await Bordro.find({
          _id: { $in: bordroIds },
          status: 'company_approved',
        }).populate('employee', 'firstName lastName');

        for (const bordro of approvedBordros) {
          try {
            const user = await User.findOne({ employee: bordro.employee._id });
            if (user) {
              await notificationService.send({
                recipient: user._id,
                recipientType: 'employee',
                company: bordro.company,
                type: 'BORDRO_PENDING_APPROVAL',
                title: 'Bordronuz Hazır',
                body: `${bordroService.getMonthName(bordro.month)} ${bordro.year} dönemi bordronuz hazırlandı. Lütfen kontrol edip onaylayın.`,
                data: { bordroId: bordro._id, year: bordro.year, month: bordro.month },
                relatedModel: 'Bordro',
                relatedId: bordro._id,
                priority: 'high',
              });
            }
          } catch (notifyError) {
            console.error('Bordro bildirim hatası:', notifyError);
          }
        }
      }

      return successResponse(res, {
        approvedCount: result.modifiedCount,
        message: `${result.modifiedCount} bordro onaylandı ve çalışanlara gönderildi`,
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * POST /api/bordro/:id/company-reject
 * Şirket yöneticisi bordroyu reddeder
 * Rol: company_admin
 */
router.post(
  '/:id/company-reject',
  auth,
  requireRole('company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'),
  async (req, res) => {
    try {
      const { reason } = req.body;

      if (!reason || reason.trim().length < 10) {
        return errorResponse(res, { message: 'Red sebebi en az 10 karakter olmalıdır' });
      }

      const bordro = await Bordro.findById(req.params.id)
        .populate('employee', 'firstName lastName email')
        .populate('company');

      if (!bordro) {
        return notFound(res, 'Bordro bulunamadı');
      }

      // Şirket yetki kontrolü
      const userCompanyId = req.user.company?._id || req.user.company;
      if (bordro.company._id.toString() !== userCompanyId.toString()) {
        return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
      }

      // Zaten işlem yapılmış mı?
      if (bordro.status === 'approved') {
        return errorResponse(res, { message: 'Bu bordro zaten onaylanmış, reddedilemez' });
      }

      if (bordro.status === 'rejected') {
        return errorResponse(res, { message: 'Bu bordro zaten reddedilmiş' });
      }

      // Reddet
      bordro.status = 'rejected';
      bordro.rejectedBy = req.user._id;
      bordro.rejectedAt = new Date();
      bordro.rejectionReason = reason.trim();
      await bordro.save();

      // Bayiye bildirim gönder
      try {
        const Role = require('../models/Role');
        const bayiAdminRole = await Role.findOne({ name: 'bayi_admin' });

        const dealerAdmins = await User.find({
          dealer: bordro.company.dealer,
          role: bayiAdminRole._id,
        });

        for (const admin of dealerAdmins) {
          await notificationService.send({
            recipient: admin._id,
            recipientType: 'bayi_admin',
            company: bordro.company._id,
            type: 'BORDRO_REJECTED',
            title: 'Bordro Reddedildi',
            body: `${bordro.employee.firstName} ${bordro.employee.lastName} için ${bordroService.getMonthName(bordro.month)} ${bordro.year} bordrosu şirket tarafından reddedildi.`,
            data: { bordroId: bordro._id, reason: bordro.rejectionReason },
            relatedModel: 'Bordro',
            relatedId: bordro._id,
            priority: 'high',
          });
        }
      } catch (notifyError) {
        console.error('Bordro red bildirimi gönderilemedi:', notifyError);
      }

      return successResponse(res, {
        rejectedAt: bordro.rejectedAt,
        message: 'Bordro reddedildi ve bayiye bildirildi',
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

// ==================== ÇALIŞAN ENDPOINT'LERİ ====================

/**
 * GET /api/bordro/my-bordros
 * Çalışanın kendi bordroları (şirket onaylı veya tam onaylı)
 * Rol: employee
 */
router.get('/my-bordros', auth, async (req, res) => {
  try {
    // Çalışan kontrolü - User-Employee bağlantısı var mı?
    if (!req.user.employee) {
      return errorResponse(
        res,
        {
          message:
            'Hesabınız çalışan kaydına bağlı değil. Lütfen sistem yöneticisi ile iletişime geçin.',
        },
        403
      );
    }

    const employeeId = req.user.employee?._id || req.user.employee;

    // Şirket onaylı veya tam onaylı bordroları göster
    // company_approved: çalışan onayı bekliyor
    // approved: çalışan da onaylamış
    let query = {
      employee: employeeId,
      status: { $in: ['company_approved', 'approved'] },
    };

    // Filtreler
    if (req.query.year) query.year = parseInt(req.query.year);
    if (req.query.month) query.month = parseInt(req.query.month);

    const bordros = await Bordro.find(query)
      .populate('company', 'name')
      .sort({ year: -1, month: -1 });

    return successResponse(res, {
      data: bordros,
      meta: {
        totalCount: bordros.length,
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/bordro/:id
 * Bordro detayı
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const bordro = await Bordro.findById(req.params.id)
      .populate('employee', 'firstName lastName tcKimlik email')
      .populate('company', 'name')
      .populate('companyApprovedBy', 'email');

    if (!bordro) {
      return notFound(res, 'Bordro bulunamadı');
    }

    // Yetki kontrolü - çalışan sadece kendi şirket onaylı veya tam onaylı bordrosunu görebilir
    if (req.user.role.name === 'employee') {
      // User-Employee bağlantısı kontrolü
      const userEmployeeId = req.user.employee?._id || req.user.employee;
      if (!userEmployeeId) {
        return errorResponse(
          res,
          {
            message:
              'Hesabınız çalışan kaydına bağlı değil. Lütfen sistem yöneticisi ile iletişime geçin.',
          },
          403
        );
      }

      if (bordro.employee._id.toString() !== userEmployeeId.toString()) {
        return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
      }

      // Çalışan şirket onaylı veya tam onaylı bordroları görebilir
      if (!['company_approved', 'approved'].includes(bordro.status)) {
        return forbidden(res, 'Bu bordro henüz onaylanmamış');
      }

      // Görüntüleme kaydı
      await bordro.recordView();
    }

    // Bayi kontrolü
    if (req.user.role.name === 'bayi_admin') {
      const company = await Company.findById(bordro.company);
      const userDealerId = req.user.dealer?._id || req.user.dealer;
      if (company.dealer.toString() !== userDealerId.toString()) {
        return forbidden(res);
      }
    }

    // Company admin kontrolü
    const companyAdminRoles = [
      'company_admin',
      'resmi_muhasebe_ik',
      'SIRKET_ADMIN',
      'IK_OPERASYON',
    ];
    if (companyAdminRoles.includes(req.user.role.name)) {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (bordro.company._id.toString() !== userCompanyId.toString()) {
        return forbidden(res);
      }
    }

    return successResponse(res, { data: bordro });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * DELETE /api/bordro/uploads/:id
 * Yüklemeyi sil (ilişkili tüm bordroları da siler)
 * Rol: bayi_admin, super_admin
 */
router.delete('/uploads/:id', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const upload = await BordroUpload.findById(req.params.id);

    if (!upload) {
      return notFound(res, 'Yükleme bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name === 'bayi_admin') {
      const userDealerId = req.user.dealer?._id || req.user.dealer;
      if (upload.dealer.toString() !== userDealerId.toString()) {
        return forbidden(res, 'Bu yüklemeyi silme yetkiniz yok');
      }
    }

    // Onaylanmış bordro var mı kontrol et
    const approvedCount = await Bordro.countDocuments({
      upload: upload._id,
      status: 'approved',
    });

    if (approvedCount > 0) {
      return errorResponse(res, {
        message: `Bu yüklemede ${approvedCount} adet onaylanmış bordro var. Onaylanmış bordrolar silinemez.`,
      });
    }

    // İlişkili bordroları sil
    const deleteResult = await Bordro.deleteMany({ upload: upload._id });

    // Dosyayı sil
    if (upload.filePath && fs.existsSync(upload.filePath)) {
      try {
        fs.unlinkSync(upload.filePath);
      } catch (fileError) {
        console.error('Dosya silinemedi:', fileError);
      }
    }

    // Upload kaydını sil
    await BordroUpload.findByIdAndDelete(upload._id);

    return successResponse(res, {
      message: `Yükleme ve ${deleteResult.deletedCount} bordro kaydı silindi`,
      deletedBordroCount: deleteResult.deletedCount,
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * DELETE /api/bordro/:id
 * Tek bir bordro kaydını sil (sadece pending durumundakiler)
 * Rol: bayi_admin, super_admin, company_admin
 */
router.delete(
  '/:id',
  auth,
  requireRole(
    'super_admin',
    'bayi_admin',
    'company_admin',
    'resmi_muhasebe_ik',
    'SIRKET_ADMIN',
    'IK_OPERASYON'
  ),
  async (req, res) => {
    try {
      const bordro = await Bordro.findById(req.params.id).populate('company');

      if (!bordro) {
        return notFound(res, 'Bordro bulunamadı');
      }

      // Yetki kontrolü
      const companyAdminRoles = [
        'company_admin',
        'resmi_muhasebe_ik',
        'SIRKET_ADMIN',
        'IK_OPERASYON',
      ];
      if (companyAdminRoles.includes(req.user.role.name)) {
        const userCompanyId = req.user.company?._id || req.user.company;
        if (bordro.company._id.toString() !== userCompanyId.toString()) {
          return forbidden(res, 'Bu bordroyu silme yetkiniz yok');
        }
      } else if (req.user.role.name === 'bayi_admin') {
        const userDealerId = req.user.dealer?._id || req.user.dealer;
        if (bordro.company.dealer.toString() !== userDealerId.toString()) {
          return forbidden(res, 'Bu bordroyu silme yetkiniz yok');
        }
      }

      // Sadece pending durumundaki bordrolar silinebilir
      if (bordro.status !== 'pending') {
        return errorResponse(res, {
          message: 'Sadece "Beklemede" durumundaki bordrolar silinebilir. Önce geri alın.',
        });
      }

      // Bordroyu sil
      await Bordro.findByIdAndDelete(bordro._id);

      // Upload istatistiklerini güncelle
      if (bordro.upload) {
        const upload = await BordroUpload.findById(bordro.upload);
        if (upload && upload.stats) {
          upload.stats.successCount = Math.max(0, (upload.stats.successCount || 0) - 1);
          upload.stats.totalRows = Math.max(0, (upload.stats.totalRows || 0) - 1);
          await upload.save();
        }
      }

      return successResponse(res, {
        message: 'Bordro kaydı silindi',
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * GET /api/bordro/template
 * Örnek Excel şablonu indir
 * Rol: bayi_admin
 */
router.get('/template', auth, requireRole('super_admin', 'bayi_admin'), async (req, res) => {
  try {
    const buffer = bordroService.generateTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=bordro_sablon.xlsx');

    res.send(buffer);
  } catch (error) {
    return serverError(res, error, 'Şablon oluşturulamadı');
  }
});

// ==================== ÇALIŞAN ONAY ENDPOINT'LERİ ====================

/**
 * POST /api/bordro/:id/request-approval-code
 * Çalışan için onay kodu iste (SMS ile gönderilir)
 * Hukuki delil niteliği için SMS tercih edilir
 * Rol: employee
 */
router.post('/:id/request-approval-code', auth, async (req, res) => {
  try {
    if (!req.user.employee) {
      return forbidden(res, 'Bu işlem sadece çalışanlar için geçerlidir');
    }

    const bordro = await Bordro.findById(req.params.id)
      .populate('employee', 'firstName lastName email phone mobilePhone')
      .populate('company', 'name');

    if (!bordro) {
      return notFound(res, 'Bordro bulunamadı');
    }

    // Sadece kendi bordrosu olmalı
    const userEmployeeId = req.user.employee?._id || req.user.employee;
    if (bordro.employee._id.toString() !== userEmployeeId.toString()) {
      return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
    }

    // Status kontrolü - sadece company_approved durumundaki bordrolar onaylanabilir
    if (bordro.status !== 'company_approved') {
      if (bordro.status === 'approved') {
        return errorResponse(res, { message: 'Bu bordro zaten onaylanmış' });
      }
      if (bordro.status === 'rejected') {
        return errorResponse(res, { message: 'Bu bordro reddedilmiş, onay kodu istenemez' });
      }
      return errorResponse(res, { message: 'Bu bordro henüz şirket tarafından onaylanmamış' });
    }

    // Çalışanın telefon numarasını al
    const phone = bordro.employee.mobilePhone || bordro.employee.phone;
    if (!phone) {
      return errorResponse(res, {
        message: 'Telefon numaranız kayıtlı değil. Lütfen profil bilgilerinizi güncelleyin.',
      });
    }

    // SMS ile OTP gönder
    try {
      const result = await smsService.sendBordroApprovalOtp({
        phone,
        bordroId: bordro._id,
        employee: bordro.employee._id,
        company: bordro.company._id,
        month: bordro.month,
        year: bordro.year,
      });

      // Bordro'ya SMS doğrulama referansını kaydet
      bordro.smsVerification = result.verificationId;
      bordro.employeeApprovalPhone = phone;
      bordro.approvalMethod = 'sms';
      bordro.employeeApprovalCodeLastRequest = new Date();
      await bordro.save();

      return successResponse(res, {
        message: 'Onay kodu telefonunuza SMS olarak gönderildi',
        verificationId: result.verificationId,
        maskedPhone: result.maskedPhone,
        expiresAt: result.expiresAt,
        expiresInMinutes: result.expiresInMinutes,
      });
    } catch (smsError) {
      console.error('SMS gönderilemedi:', smsError);
      return errorResponse(res, {
        message: smsError.message || 'SMS gönderilemedi. Lütfen daha sonra tekrar deneyin.',
      });
    }
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * POST /api/bordro/:id/employee-approve
 * Çalışan bordroyu onaylar (SMS kod doğrulama ile)
 * Hukuki delil niteliği taşır - RFC 3161 zaman damgası ile
 * Rol: employee
 */
router.post('/:id/employee-approve', auth, async (req, res) => {
  try {
    if (!req.user.employee) {
      return forbidden(res, 'Bu işlem sadece çalışanlar için geçerlidir');
    }

    const { code, verificationId } = req.body;

    if (!code || code.length !== 6) {
      return errorResponse(res, { message: 'Geçerli bir 6 haneli kod giriniz' });
    }

    const bordro = await Bordro.findById(req.params.id)
      .populate('employee', 'firstName lastName email')
      .populate('company', 'name');

    if (!bordro) {
      return notFound(res, 'Bordro bulunamadı');
    }

    // Sadece kendi bordrosu olmalı
    const userEmployeeId = req.user.employee?._id || req.user.employee;
    if (bordro.employee._id.toString() !== userEmployeeId.toString()) {
      return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
    }

    // Status kontrolü
    if (bordro.status !== 'company_approved') {
      if (bordro.status === 'approved') {
        return errorResponse(res, { message: 'Bu bordro zaten onaylanmış' });
      }
      return errorResponse(res, { message: 'Bu bordro onay için uygun değil' });
    }

    // SMS doğrulama ID'sini belirle
    const smsVerificationId = verificationId || bordro.smsVerification;
    if (!smsVerificationId) {
      return errorResponse(res, { message: 'Önce onay kodu talep etmelisiniz' });
    }

    // SMS doğrulaması yap (zaman damgası ile)
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    try {
      const verifyResult = await smsService.verifyOtpWithTimestamp(
        smsVerificationId,
        code,
        clientIp,
        timestampService
      );

      // Onay ver
      bordro.status = 'approved';
      bordro.employeeApprovedAt = new Date();
      bordro.employeeApprovedIp = clientIp;
      bordro.smsVerification = verifyResult.verification._id;

      // Zaman damgalı PDF oluştur
      let timestampResult = null;
      if (isTimestampEnabled()) {
        try {
          console.log('Bordro PDF oluşturuluyor...');
          // PDF oluştur
          const pdfBuffer = await bordroPdfService.generateBordroPdf(bordro);

          console.log('Zaman damgası alınıyor...');
          // Zaman damgası al
          timestampResult = await timestampService.timestampPdf(pdfBuffer, bordro);

          if (timestampResult.success) {
            // Zaman damgası bilgisini PDF'e ekle
            const timestampedPdf = await bordroPdfService.addTimestampInfoToPdf(pdfBuffer, {
              genTime: timestampResult.token.genTime.toLocaleString('tr-TR'),
              tsaName: timestampResult.token.tsaName,
              serialNumber: timestampResult.token.serialNumber,
              messageImprint: timestampResult.token.messageImprint,
              // SMS doğrulama bilgisi de ekle
              smsVerified: true,
              smsPhone: bordro.employeeApprovalPhone,
              smsVerifiedAt: verifyResult.verification.verifiedAt,
            });

            // PDF'i kaydet
            const pdfFileName = `${bordro._id}_${Date.now()}.pdf`;
            const pdfPath = path.join('uploads', 'bordro-pdf', pdfFileName);
            await fs.promises.writeFile(pdfPath, timestampedPdf);

            // Bordro'yu güncelle
            bordro.timestampedPdfPath = pdfPath;
            bordro.timestampToken = timestampResult.token;
            bordro.timestampedAt = new Date();
            bordro.timestampVerified = true;

            console.log(`Zaman damgalı PDF kaydedildi: ${pdfPath}`);
          }
        } catch (timestampError) {
          console.error('Zaman damgası hatası:', timestampError.message);
          // Zaman damgası hatası bordro onayını engellemez
        }
      }

      await bordro.save();

      // Bildirim gönder
      try {
        await notificationService.send({
          recipient: req.user._id,
          recipientType: 'employee',
          company: bordro.company._id,
          type: 'BORDRO_APPROVED',
          title: 'Bordronuz Onaylandı',
          body: `${bordroService.getMonthName(bordro.month)} ${bordro.year} dönemi bordronuzu SMS doğrulaması ile başarıyla onayladınız.`,
          data: { bordroId: bordro._id },
          relatedModel: 'Bordro',
          relatedId: bordro._id,
          priority: 'normal',
        });
      } catch (notifyError) {
        console.error('Onay bildirimi gönderilemedi:', notifyError);
      }

      return successResponse(res, {
        message: 'Bordronuz SMS doğrulaması ile başarıyla onaylandı',
        approvedAt: bordro.employeeApprovedAt,
        smsVerification: {
          verifiedAt: verifyResult.verification.verifiedAt,
          phone: verifyResult.verification.maskedPhone,
          timestamped: !!verifyResult.verification.timestampedAt,
        },
        timestamp: bordro.timestampedAt
          ? {
              timestampedAt: bordro.timestampedAt,
              tsaName: bordro.timestampToken?.tsaName,
              pdfAvailable: !!bordro.timestampedPdfPath,
            }
          : null,
      });
    } catch (verifyError) {
      return errorResponse(res, { message: verifyError.message });
    }
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/bordro/:id/download-pdf
 * Zaman damgalı PDF indir
 * Rol: employee (kendi bordrosu), company_admin, bayi_admin
 */
router.get('/:id/download-pdf', auth, async (req, res) => {
  try {
    const bordro = await Bordro.findById(req.params.id)
      .populate(
        'employee',
        'firstName lastName tcKimlik position hireDate lastHireDate employeeNumber workplace'
      )
      .populate('company', 'name address taxNumber mersisNo')
      .populate({
        path: 'employee',
        populate: {
          path: 'workplace',
          select: 'sgkRegisterNumber name',
        },
      });

    if (!bordro) {
      return notFound(res, 'Bordro bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name === 'employee') {
      const userEmployeeId = req.user.employee?._id || req.user.employee;
      if (bordro.employee._id.toString() !== userEmployeeId.toString()) {
        return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
      }
    }

    // PDF var mı kontrol et
    if (!bordro.timestampedPdfPath) {
      // PDF yoksa anında oluştur
      try {
        const pdfBuffer = await bordroPdfService.generateBordroPdf(bordro);

        const fileName = `Bordro_${bordro.employeeName}_${bordroService.getMonthName(bordro.month)}_${bordro.year}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(fileName)}"`
        );
        res.setHeader('Content-Length', pdfBuffer.length);

        return res.send(pdfBuffer);
      } catch (pdfError) {
        return serverError(res, pdfError);
      }
    }

    // Zaman damgalı PDF'i gönder
    const pdfPath = path.join(__dirname, '..', bordro.timestampedPdfPath);

    if (!fs.existsSync(pdfPath)) {
      return notFound(res, 'PDF dosyası bulunamadı');
    }

    const fileName = `Bordro_${bordro.employeeName}_${bordroService.getMonthName(bordro.month)}_${bordro.year}_Damgali.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/bordro/:id/verify-timestamp
 * Zaman damgasını doğrula
 * Rol: employee, company_admin, bayi_admin
 */
router.get('/:id/verify-timestamp', auth, async (req, res) => {
  try {
    const bordro = await Bordro.findById(req.params.id);

    if (!bordro) {
      return notFound(res, 'Bordro bulunamadı');
    }

    // Yetki kontrolü
    if (req.user.role.name === 'employee') {
      const userEmployeeId = req.user.employee?._id || req.user.employee;
      if (bordro.employee.toString() !== userEmployeeId.toString()) {
        return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
      }
    }

    // Zaman damgası var mı?
    if (!bordro.timestampToken || !bordro.timestampedPdfPath) {
      return errorResponse(res, { message: 'Bu bordro zaman damgalı değil' });
    }

    // PDF'i oku
    const pdfPath = path.join(__dirname, '..', bordro.timestampedPdfPath);

    if (!fs.existsSync(pdfPath)) {
      return errorResponse(res, { message: 'PDF dosyası bulunamadı' });
    }

    const pdfBuffer = await fs.promises.readFile(pdfPath);

    // Doğrula
    const verifyResult = await timestampService.verifyTimestamp(
      pdfBuffer,
      bordro.timestampToken,
      bordro
    );

    return successResponse(res, {
      verified: verifyResult.verified,
      timestamp: {
        genTime: bordro.timestampToken.genTime,
        tsaName: bordro.timestampToken.tsaName,
        serialNumber: bordro.timestampToken.serialNumber,
        hashAlgorithm: bordro.timestampToken.hashAlgorithm,
      },
      verification: {
        originalHash: verifyResult.originalHash,
        currentHash: verifyResult.currentHash,
        match: verifyResult.verified,
      },
    });
  } catch (error) {
    return serverError(res, error);
  }
});

/**
 * GET /api/bordro/admin/timestamp-health
 * TSA sunucu durumunu kontrol et
 * Rol: super_admin, bayi_admin
 */
router.get(
  '/admin/timestamp-health',
  auth,
  requireRole('super_admin', 'bayi_admin'),
  async (req, res) => {
    try {
      const healthResult = await timestampService.healthCheck();

      return successResponse(res, {
        timestampEnabled: isTimestampEnabled(),
        ...healthResult,
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * POST /api/bordro/:id/employee-reject
 * Çalışan bordroyu reddeder (itiraz)
 * Rol: employee
 */
router.post('/:id/employee-reject', auth, async (req, res) => {
  try {
    if (!req.user.employee) {
      return forbidden(res, 'Bu işlem sadece çalışanlar için geçerlidir');
    }

    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return errorResponse(res, { message: 'İtiraz sebebi en az 10 karakter olmalıdır' });
    }

    const bordro = await Bordro.findById(req.params.id)
      .populate('employee', 'firstName lastName email')
      .populate('company', 'name dealer');

    if (!bordro) {
      return notFound(res, 'Bordro bulunamadı');
    }

    // Sadece kendi bordrosu olmalı
    const userEmployeeId = req.user.employee?._id || req.user.employee;
    if (bordro.employee._id.toString() !== userEmployeeId.toString()) {
      return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
    }

    // Status kontrolü
    if (bordro.status !== 'company_approved') {
      if (bordro.status === 'approved') {
        return errorResponse(res, { message: 'Onaylanmış bordro reddedilemez' });
      }
      if (bordro.status === 'rejected') {
        return errorResponse(res, { message: 'Bu bordro zaten reddedilmiş' });
      }
      return errorResponse(res, { message: 'Bu bordro red için uygun değil' });
    }

    // Reddet
    bordro.status = 'rejected';
    bordro.rejectedAt = new Date();
    bordro.rejectionReason = reason.trim();
    bordro.employeeApprovalCode = null;
    bordro.employeeApprovalCodeExpires = null;
    await bordro.save();

    // Bayiye bildirim gönder
    try {
      const dealerAdmins = await User.find({
        dealer: bordro.company.dealer,
        role: { $in: await require('../models/Role').find({ name: 'bayi_admin' }).select('_id') },
      });

      for (const admin of dealerAdmins) {
        await notificationService.send({
          recipient: admin._id,
          recipientType: 'bayi_admin',
          company: bordro.company._id,
          type: 'BORDRO_REJECTED',
          title: 'Çalışan Bordro İtirazı',
          body: `${bordro.employee.firstName} ${bordro.employee.lastName} bordrosuna itiraz etti: ${reason.substring(0, 50)}...`,
          data: { bordroId: bordro._id, reason: bordro.rejectionReason },
          relatedModel: 'Bordro',
          relatedId: bordro._id,
          priority: 'high',
        });
      }

      bordro.rejectionNotifiedToDealer = true;
      await bordro.save();
    } catch (notifyError) {
      console.error('İtiraz bildirimi gönderilemedi:', notifyError);
    }

    return successResponse(res, {
      message: 'İtirazınız kaydedildi ve bayiye bildirildi',
      rejectedAt: bordro.rejectedAt,
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// ==================== DURUM GERİ ALMA VE SİLME ENDPOINT'LERİ ====================

/**
 * POST /api/bordro/:id/revert-to-pending
 * Bordroyu pending durumuna geri al
 * company_approved veya approved durumundaki bordroları pending'e çeker
 * Rol: company_admin, bayi_admin, super_admin
 */
router.post(
  '/:id/revert-to-pending',
  auth,
  requireRole(
    'super_admin',
    'bayi_admin',
    'company_admin',
    'resmi_muhasebe_ik',
    'SIRKET_ADMIN',
    'IK_OPERASYON'
  ),
  async (req, res) => {
    try {
      const bordro = await Bordro.findById(req.params.id)
        .populate('employee', 'firstName lastName')
        .populate('company');

      if (!bordro) {
        return notFound(res, 'Bordro bulunamadı');
      }

      // Yetki kontrolü
      const companyAdminRoles = [
        'company_admin',
        'resmi_muhasebe_ik',
        'SIRKET_ADMIN',
        'IK_OPERASYON',
      ];
      if (companyAdminRoles.includes(req.user.role.name)) {
        const userCompanyId = req.user.company?._id || req.user.company;
        if (bordro.company._id.toString() !== userCompanyId.toString()) {
          return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
        }
      } else if (req.user.role.name === 'bayi_admin') {
        const userDealerId = req.user.dealer?._id || req.user.dealer;
        if (bordro.company.dealer.toString() !== userDealerId.toString()) {
          return forbidden(res, 'Bu bordroya erişim yetkiniz yok');
        }
      }

      // Sadece company_approved veya approved durumundaki bordrolar geri alınabilir
      if (!['company_approved', 'approved'].includes(bordro.status)) {
        return errorResponse(res, {
          message: 'Bu bordro geri alınamaz. Sadece onaylı bordrolar geri alınabilir.',
        });
      }

      const previousStatus = bordro.status;

      // Durumu pending'e çek
      bordro.status = 'pending';
      bordro.companyApprovedBy = null;
      bordro.companyApprovedAt = null;
      bordro.companyApprovalNote = null;
      bordro.employeeApprovedAt = null;
      bordro.employeeApprovedIp = null;
      bordro.employeeApprovalCode = null;
      bordro.employeeApprovalCodeExpires = null;
      bordro.employeeApprovalCodeAttempts = 0;
      bordro.revertedAt = new Date();
      bordro.revertedBy = req.user._id;
      bordro.revertedFromStatus = previousStatus;

      await bordro.save();

      return successResponse(res, {
        message: `Bordro "Beklemede" durumuna geri alındı`,
        previousStatus,
        bordroId: bordro._id,
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * POST /api/bordro/bulk-revert
 * Toplu bordro geri alma
 * Rol: company_admin, bayi_admin, super_admin
 */
router.post(
  '/bulk-revert',
  auth,
  requireRole(
    'super_admin',
    'bayi_admin',
    'company_admin',
    'resmi_muhasebe_ik',
    'SIRKET_ADMIN',
    'IK_OPERASYON'
  ),
  async (req, res) => {
    try {
      const { bordroIds } = req.body;

      if (!bordroIds || !Array.isArray(bordroIds) || bordroIds.length === 0) {
        return errorResponse(res, { message: 'Bordro ID listesi gereklidir' });
      }

      // Yetki filtresi oluştur
      let companyFilter = {};
      const companyAdminRoles = [
        'company_admin',
        'resmi_muhasebe_ik',
        'SIRKET_ADMIN',
        'IK_OPERASYON',
      ];

      if (companyAdminRoles.includes(req.user.role.name)) {
        const userCompanyId = req.user.company?._id || req.user.company;
        companyFilter.company = userCompanyId;
      } else if (req.user.role.name === 'bayi_admin') {
        const companies = await Company.find({ dealer: req.user.dealer?._id || req.user.dealer });
        companyFilter.company = { $in: companies.map(c => c._id) };
      }

      // Geri alınabilecek bordroları bul
      const bordrosToRevert = await Bordro.find({
        _id: { $in: bordroIds },
        ...companyFilter,
        status: { $in: ['company_approved', 'approved'] },
      });

      if (bordrosToRevert.length === 0) {
        return errorResponse(res, { message: 'Geri alınabilecek bordro bulunamadı' });
      }

      // Toplu güncelleme
      const result = await Bordro.updateMany(
        {
          _id: { $in: bordrosToRevert.map(b => b._id) },
        },
        {
          $set: {
            status: 'pending',
            companyApprovedBy: null,
            companyApprovedAt: null,
            companyApprovalNote: null,
            employeeApprovedAt: null,
            employeeApprovedIp: null,
            employeeApprovalCode: null,
            employeeApprovalCodeExpires: null,
            employeeApprovalCodeAttempts: 0,
            revertedAt: new Date(),
            revertedBy: req.user._id,
          },
        }
      );

      // Kaç tanesi çalışan onaylıydı
      const approvedCount = bordrosToRevert.filter(b => b.status === 'approved').length;
      const companyApprovedCount = bordrosToRevert.filter(
        b => b.status === 'company_approved'
      ).length;

      return successResponse(res, {
        message: `${result.modifiedCount} bordro "Beklemede" durumuna geri alındı`,
        revertedCount: result.modifiedCount,
        approvedCount,
        companyApprovedCount,
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

/**
 * POST /api/bordro/bulk-delete
 * Toplu bordro silme (sadece pending durumundakiler)
 * Rol: company_admin, bayi_admin, super_admin
 */
router.post(
  '/bulk-delete',
  auth,
  requireRole(
    'super_admin',
    'bayi_admin',
    'company_admin',
    'resmi_muhasebe_ik',
    'SIRKET_ADMIN',
    'IK_OPERASYON'
  ),
  async (req, res) => {
    try {
      const { bordroIds } = req.body;

      if (!bordroIds || !Array.isArray(bordroIds) || bordroIds.length === 0) {
        return errorResponse(res, { message: 'Bordro ID listesi gereklidir' });
      }

      // Yetki filtresi oluştur
      let companyFilter = {};
      const companyAdminRoles = [
        'company_admin',
        'resmi_muhasebe_ik',
        'SIRKET_ADMIN',
        'IK_OPERASYON',
      ];

      if (companyAdminRoles.includes(req.user.role.name)) {
        const userCompanyId = req.user.company?._id || req.user.company;
        companyFilter.company = userCompanyId;
      } else if (req.user.role.name === 'bayi_admin') {
        const companies = await Company.find({ dealer: req.user.dealer?._id || req.user.dealer });
        companyFilter.company = { $in: companies.map(c => c._id) };
      }

      // Silinebilecek bordroları kontrol et (sadece pending)
      const bordrosToDelete = await Bordro.find({
        _id: { $in: bordroIds },
        ...companyFilter,
        status: 'pending',
      });

      if (bordrosToDelete.length === 0) {
        return errorResponse(res, {
          message:
            'Silinebilecek bordro bulunamadı. Sadece "Beklemede" durumundaki bordrolar silinebilir.',
        });
      }

      // Upload istatistiklerini güncelle
      const uploadIds = [
        ...new Set(bordrosToDelete.filter(b => b.upload).map(b => b.upload.toString())),
      ];
      for (const uploadId of uploadIds) {
        const deleteCountForUpload = bordrosToDelete.filter(
          b => b.upload && b.upload.toString() === uploadId
        ).length;
        await BordroUpload.findByIdAndUpdate(uploadId, {
          $inc: {
            'stats.successCount': -deleteCountForUpload,
            'stats.totalRows': -deleteCountForUpload,
          },
        });
      }

      // Toplu silme
      const result = await Bordro.deleteMany({
        _id: { $in: bordrosToDelete.map(b => b._id) },
      });

      return successResponse(res, {
        message: `${result.deletedCount} bordro silindi`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      return serverError(res, error);
    }
  }
);

module.exports = router;
