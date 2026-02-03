const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveLedger = require('../models/LeaveLedger');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Department = require('../models/Department');
const WorkingPermit = require('../models/WorkingPermit');
const CompanyLeaveType = require('../models/CompanyLeaveType');
const LeaveSubType = require('../models/LeaveSubType');
const { auth, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { successResponse, errorResponse, notFound, forbidden, serverError, createdResponse } = require('../utils/responseHelper');
const { calculateLeaveDays, calculateSeniority, calculateAge, calculateAnnualLeaveDays, getEmployeeWeekendDays, calculateWorkingDays } = require('../utils/leaveCalculator');

// Approval Logic: Yeni servis kullanılıyor
const { calculateApprovalChain } = require('../services/approvalChainService');

// Leave Ledger: İzin cetveli entegrasyonu
const { createLeaveUsedEntry, createLeaveReversalEntry, getLeaveBalanceFromLedger, getEmployeeLeaveBalance } = require('./leaveLedger');

const upload = multer({
  dest: 'uploads/leaves/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image|pdf/.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Sadece resim ve PDF dosyaları yüklenebilir'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Get all leave requests with pagination and advanced filtering
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    const {
      status,
      employee,
      company,
      startDate,
      endDate,
      leaveType,
      employeeName,
      includeDeleted,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Varsayılan olarak silinmiş kayıtları hariç tut
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Kullanıcının employee kaydını bul (yönetici kontrolü için gerekli)
    const currentUserEmployee = await Employee.findOne({ email: req.user.email });

    // Rol bazlı erişim kontrolü
    if (employee) {
      query.employee = employee;
    } else if (req.user.role.name === 'employee') {
      // Çalışan (yetki seviyesi 3) - sadece kendi taleplerini görür
      if (currentUserEmployee) {
        query.employee = currentUserEmployee._id;
      } else {
        return res.json({ 
          success: true, 
          data: [], 
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } 
        });
      }
    } else if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      // Şirket adminleri (yetki seviyesi 1) - tüm talepleri görür
      if (company) {
        query.company = company;
      } else {
        query.company = req.user.company;
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      // Bayi admin - bayi şirketlerinin taleplerini görür
      if (company) {
        const companyDoc = await Company.findById(company);
        if (!companyDoc || companyDoc.dealer.toString() !== req.user.dealer.toString()) {
          return forbidden(res);
        }
        query.company = company;
      } else {
        const companies = await Company.find({ dealer: req.user.dealer });
        query.company = { $in: companies.map(c => c._id) };
      }
    } else if (currentUserEmployee && currentUserEmployee.department) {
      // Yetkilendirilmiş yönetici (yetki seviyesi 2) - kendi birimindeki çalışanların taleplerini görür
      const department = await Department.findById(currentUserEmployee.department);
      if (department && department.manager && department.manager.toString() === currentUserEmployee._id.toString()) {
        const departmentEmployees = await Employee.find({ department: currentUserEmployee.department });
        query.employee = { $in: departmentEmployees.map(e => e._id) };
        query.company = currentUserEmployee.company;
      } else if (currentUserEmployee.manager) {
        const managedEmployees = await Employee.find({ manager: currentUserEmployee._id });
        if (managedEmployees.length > 0) {
          query.employee = { $in: managedEmployees.map(e => e._id) };
          query.company = currentUserEmployee.company;
        } else {
          query.employee = currentUserEmployee._id;
        }
      } else {
        query.employee = currentUserEmployee._id;
      }
    } else {
      // Diğer durumlar için sadece kendi taleplerini görsün
      if (currentUserEmployee) {
        query.employee = currentUserEmployee._id;
      } else {
        return res.json({ 
          success: true, 
          data: [], 
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } 
        });
      }
    }

    // Durum filtresi
    if (status) {
      query.status = status;
    }

    // Tarih aralığı filtresi
    if (startDate && endDate) {
      query.$or = [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        }
      ];
    }

    // İzin türü filtresi
    if (leaveType) {
      query.$or = [
        { companyLeaveType: leaveType },
        { leaveSubType: leaveType }
      ];
    }

    // Çalışan adı arama filtresi
    if (employeeName) {
      const employees = await Employee.find({
        $or: [
          { firstName: { $regex: employeeName, $options: 'i' } },
          { lastName: { $regex: employeeName, $options: 'i' } }
        ]
      }).select('_id');
      
      if (employees.length > 0) {
        query.employee = { $in: employees.map(e => e._id) };
      } else {
        // Eğer eşleşen çalışan yoksa boş sonuç döndür
        return res.json({ 
          success: true, 
          data: [], 
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } 
        });
      }
    }

    // Toplam kayıt sayısı
    const total = await LeaveRequest.countDocuments(query);

    // Sıralama
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Verileri çek
    const requests = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName email employeeNumber department manager')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('reviewedBy', 'email')
      .populate('currentApprover', 'firstName lastName email')
      .populate('createdByAdmin', 'email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});


// GET /api/leave-requests/my - Çalışan kendi taleplerini listeler
router.get('/my', auth, async (req, res) => {
  try {
    // Çalışan bilgisini bul
    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const requests = await LeaveRequest.find({ employee: employee._id })
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: 'İzin talepleri başarıyla getirildi',
      data: requests
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET /api/leave-requests/rejected - Reddedilen talepler
router.get('/rejected', auth, async (req, res) => {
  try {
    let query = { status: 'REJECTED' };

    if (req.user.role.name === 'employee') {
      // Çalışan sadece kendi reddedilen taleplerini görür
      const emp = await Employee.findOne({ email: req.user.email });
      if (emp) {
        query.employee = emp._id;
      } else {
        return res.json({ success: true, data: [] });
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      // Şirket admini şirketindeki tüm reddedilen talepleri görür
      query.company = req.user.company;
    } else if (req.user.role.name === 'bayi_admin') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    }

    const rejectedRequests = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('history.approver', 'firstName lastName email')
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      message: 'Reddedilen izin talepleri başarıyla getirildi',
      data: rejectedRequests
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET /api/leave-requests/pending - Yöneticinin bekleyen talepleri
router.get('/pending', auth, async (req, res) => {
  try {
    // Kullanıcının employee kaydını bul
    const currentUserEmployee = await Employee.findOne({ email: req.user.email });
    if (!currentUserEmployee) {
      return successResponse(res, { message: 'Çalışan kaydı bulunamadı', data: [] });
    }

    // Bu kullanıcının onaylaması gereken talepleri bul
    // currentApprover = currentUserEmployee._id ve status = IN_PROGRESS veya PENDING
    const pendingRequests = await LeaveRequest.find({
      currentApprover: currentUserEmployee._id,
      status: { $in: ['PENDING', 'IN_PROGRESS'] }
    })
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: 'Bekleyen izin talepleri başarıyla getirildi',
      data: pendingRequests
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET /api/leave-requests/pending-cancellations - Yöneticinin bekleyen iptal talepleri
router.get('/pending-cancellations', auth, async (req, res) => {
  try {
    // Admin rolleri
    const isAdmin = ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name);

    // Kullanıcının employee kaydını bul
    const currentUserEmployee = await Employee.findOne({ email: req.user.email });

    let query = {
      status: 'CANCELLATION_REQUESTED'
    };

    // Yetki bazlı filtreleme
    if (isAdmin) {
      // Admin ise şirketindeki tüm iptal taleplerini görebilir
      if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
        query.company = req.user.company;
      } else if (req.user.role.name === 'bayi_admin') {
        const companies = await Company.find({ dealer: req.user.dealer });
        query.company = { $in: companies.map(c => c._id) };
      }
      // super_admin tüm talepleri görebilir
    } else if (currentUserEmployee) {
      // Normal yönetici - sadece kendi onaylayacağı talepleri görür
      query.cancellationCurrentApprover = currentUserEmployee._id;
    } else {
      return res.json({
        success: true,
        message: 'Bekleyen iptal talebi bulunamadı',
        data: []
      });
    }

    const pendingCancellations = await LeaveRequest.find(query)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('cancellationCurrentApprover', 'firstName lastName email')
      .populate('cancellationRequestedBy', 'firstName lastName email')
      .populate('cancellationHistory.approver', 'firstName lastName email')
      .sort({ cancellationRequestedAt: -1 });

    return res.json({
      success: true,
      message: 'Bekleyen iptal talepleri başarıyla getirildi',
      data: pendingCancellations
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET /api/leave-requests/deleted - Silinmiş izin taleplerini getir (sadece admin)
router.get('/deleted', auth, async (req, res) => {
  try {
    // Sadece admin yetkisi kontrol et
    const allowedRoles = ['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON', 'bayi_admin', 'BAYI_ADMIN', 'super_admin'];
    if (!allowedRoles.includes(req.user.role.name)) {
      return forbidden(res, 'Bu işlem için yetkiniz bulunmamaktadır');
    }

    let query = { isDeleted: true };

    // Şirket bazlı filtreleme
    if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      const companies = await Company.find({ dealer: req.user.dealer });
      query.company = { $in: companies.map(c => c._id) };
    } else if (req.user.role.name !== 'super_admin') {
      query.company = req.user.company;
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [requests, total] = await Promise.all([
      LeaveRequest.find(query)
        .populate('employee', 'firstName lastName email employeeNumber')
        .populate('company', 'name')
        .populate('companyLeaveType', 'name description')
        .populate('leaveSubType', 'name description')
        .populate('deletedBy', 'email firstName lastName')
        .sort({ deletedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      LeaveRequest.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get single leave request
router.get('/:id', auth, async (req, res) => {
  try {
    const request = await LeaveRequest.findById(req.params.id)
        .populate('employee')
        .populate('company')
        .populate('companyLeaveType', 'name description isOtherCategory')
        .populate('leaveSubType', 'name description')
        .populate('reviewedBy')
        .populate('currentApprover', 'firstName lastName email')
        .populate('history.approver', 'firstName lastName email');

    if (!request) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Check access
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== request.employee._id.toString()) {
        return forbidden(res);
      }
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== request.company._id.toString()) {
      return forbidden(res);
    }

    // Onay zincirini al ve populate et
    const employee = await Employee.findById(request.employee._id || request.employee);
    let approvalChainDetails = [];

    if (employee && employee.approvalChain && employee.approvalChain.length > 0) {
      // Onay zincirindeki kişileri populate et
      const chainEmployees = await Employee.find({
        _id: { $in: employee.approvalChain }
      }).select('firstName lastName email department');

      // Sırayı koruyarak map et
      approvalChainDetails = employee.approvalChain.map(id => {
        const emp = chainEmployees.find(e => e._id.toString() === id.toString());
        return emp ? {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email
        } : null;
      }).filter(Boolean);
    }

    // Eğer onay zinciri boşsa, şirket admin'i varsayılan onaylayıcı olarak göster
    if (approvalChainDetails.length === 0) {
      approvalChainDetails = [{
        _id: null,
        firstName: 'Şirket',
        lastName: 'Admin',
        email: null,
        isDefault: true
      }];
    }

    // Response'a onay zinciri ekle
    const responseData = request.toObject();
    responseData.approvalChainDetails = approvalChainDetails;

    res.json(responseData);
  } catch (error) {
    return serverError(res, error);
  }
});

// Create leave request
// Permission-based kontrol: leave:request yetkisi gerekli (employee kendi talebini oluşturabilir)
router.post('/', auth, upload.single('document'), async (req, res) => {
  try {
    const {
      companyLeaveType,
      leaveSubType,
      startDate,
      endDate,
      returnDate,
      startTime,
      endTime,
      isHalfDay,
      halfDayPeriod,
      isHourly,
      hours,
      description
    } = req.body;

    // Find employee
    let employee;
    if (req.user.role.name === 'employee') {
      employee = await Employee.findOne({ email: req.user.email });
      if (!employee) {
        return notFound(res, 'Çalışan bulunamadı. Lütfen sistem yöneticisi ile iletişime geçin.');
      }
    } else {
      if (!req.body.employee) {
        return errorResponse(res, { message: 'Çalışan seçilmelidir' });
      }
      employee = await Employee.findById(req.body.employee);
    }

    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const company = await Company.findById(employee.company);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    // Check working permit (yeni model yapısı)
    if (!companyLeaveType) {
      return errorResponse(res, { message: 'İzin türü seçilmelidir' });
    }
    // WorkingPermit modelini kullan (yeni yapı)
    const workingPermit = await WorkingPermit.findById(companyLeaveType);
    if (!workingPermit) {
      return notFound(res, 'İzin türü bulunamadı');
    }

    // Check if working permit belongs to employee's company
    if (!workingPermit.company || !employee.company ||
        workingPermit.company.toString() !== employee.company.toString()) {
      return forbidden(res, 'Bu izin türü bu şirkete ait değil');
    }

    // Check if "Diğer izinler" category requires sub type
    const isOtherCategory = workingPermit.name === 'Diğer izinler';
    if (isOtherCategory && !leaveSubType) {
      return errorResponse(res, { message: 'Alt izin türü seçilmelidir' });
    }

    // Check leave sub type if provided
    let leaveSubTypeDoc = null;
    if (leaveSubType) {
      leaveSubTypeDoc = await WorkingPermit.findById(leaveSubType);
      if (!leaveSubTypeDoc) {
        return notFound(res, 'Alt izin türü bulunamadı');
      }
      // Alt izin türünün parent'ı doğru mu kontrol et
      if (leaveSubTypeDoc.parentPermitId?.toString() !== workingPermit._id.toString()) {
        return errorResponse(res, { message: 'Alt izin türü bu kategoriye ait değil' });
      }
    }

    // Check if unpaid leave requires description
    const leaveTypeName = leaveSubTypeDoc ? leaveSubTypeDoc.name : workingPermit.name;
    const isUnpaidLeave = leaveTypeName.toLowerCase().includes('ücretsiz') || 
                          leaveTypeName.toLowerCase().includes('mazeret');
    if (isUnpaidLeave && !description) {
      return errorResponse(res, { message: 'Ücretsiz izinlerde açıklama zorunludur' });
    }

    // Yıllık izin kontrolü - Parçalı kullanım kuralı
    const isAnnualLeave = leaveTypeName.toLowerCase().includes('yıllık');
    if (isAnnualLeave) {
      const leavePolicy = company.leavePolicy || { allowSplitLeave: true, minFirstBlockDays: 10 };
      
      // Mevcut yıllık izin taleplerini kontrol et (aynı yıl içinde)
      const currentYear = new Date().getFullYear();
      const existingAnnualLeaves = await LeaveRequest.find({
        employee: employee._id,
        companyLeaveType: companyLeaveType,
        status: { $in: ['PENDING', 'IN_PROGRESS', 'APPROVED'] },
        startDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) }
      });
      
      // Parçalı kullanım kontrolü
      const requestedBlocks = existingAnnualLeaves.length + 1; // Mevcut + yeni talep
      if (!leavePolicy.allowSplitLeave && requestedBlocks > 1) {
        return errorResponse(res, { message: 'Bu şirkette izin tek parça kullanılabilir.' });
      }
      
      // İlk parça 10 gün zorunluluğu kaldırıldı
      // Artık herhangi bir gün sayısı ile yıllık izin alınabilir
    }

    // Calculate total days based on return date if provided, otherwise use endDate
    let calculatedEndDate = endDate;
    let calculatedReturnDate = returnDate;
    
    if (calculatedReturnDate) {
      // If return date is provided, calculate days from startDate to returnDate
      calculatedEndDate = calculatedReturnDate;
    }

    // Yıllık izin için pazar günü kontrolü
    // Tarih aralığında Pazar varsa otomatik düş
    // Pazar izin süresine dahil edilmeyecek
    // calculateLeaveDays fonksiyonu zaten weekendDays kullanarak pazar günlerini düşüyor

    // Calculate total days (excluding weekends based on employee's weekend settings)
    // Yıllık izin için pazar günleri otomatik olarak düşülür (weekendDays içinde 0 = Pazar)
    const totalDays = await calculateLeaveDays(
      new Date(startDate),
      new Date(calculatedEndDate),
      employee,
      Department,
      Company,
      isHalfDay === 'true' || isHalfDay === true,
      isHourly === 'true' || isHourly === true,
      parseFloat(hours) || 0
    );

    // Check for conflicts with existing leave requests (especially annual leave vs sick leave)
    const conflictCheck = await checkLeaveConflicts(employee._id, new Date(startDate), new Date(calculatedEndDate), null, companyLeaveType);

    // Handle document upload
    let documentPath = null;
    if (req.file) {
      const fileName = `leave_${employee._id}_${Date.now()}${path.extname(req.file.originalname)}`;
      const uploadsDir = path.join(__dirname, '..', 'uploads', 'leaves');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, fileName);
      fs.renameSync(req.file.path, filePath);
      documentPath = `/uploads/leaves/${fileName}`;
    }

    // Admin tarafından oluşturuluyor mu?
    const isAdminCreated = ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin'].includes(req.user.role.name);

    // Şirket izin onay ayarlarını al
    const leaveApprovalSettings = company.leaveApprovalSettings || {
      enabled: true,
      requireApproval: true,
      autoApproveIfNoApprover: false,
      approvalLevels: 0,
      allowSelfApproval: false
    };

    // Approval chain hesapla (yeni servis ile) - sadece çalışan tarafından oluşturuluyorsa
    let approvalChain = [];
    let currentApprover = null;
    let initialStatus = 'PENDING';

    if (!isAdminCreated && leaveApprovalSettings.enabled) {
      approvalChain = await calculateApprovalChain(employee._id);

      // approvalConfig'e göre onay zincirini filtrele
      const approvalConfig = workingPermit.approvalConfig || { levels: 1 };

      // Gün sayısına göre onay seviyesi belirle
      let requiredLevels = approvalConfig.levels || 1;
      if (approvalConfig.minDaysForMultiApproval && totalDays >= approvalConfig.minDaysForMultiApproval) {
        requiredLevels = Math.max(requiredLevels, 2);
      }

      // Şirket ayarlarındaki approval levels kullan (0 değilse)
      if (leaveApprovalSettings.approvalLevels > 0) {
        requiredLevels = leaveApprovalSettings.approvalLevels;
      }

      // Onay zincirini kısıtla
      let filteredChain = approvalChain;
      if (requiredLevels < approvalChain.length && requiredLevels > 0) {
        filteredChain = approvalChain.slice(0, requiredLevels);
      }

      // Tek onay yeterli ise
      if (approvalConfig.singleApprovalSufficient && filteredChain.length > 0) {
        filteredChain = [filteredChain[0]]; // Sadece ilk onaylayıcı
      }

      // Filtrelenmiş chain'i kullan
      approvalChain = filteredChain;

      // İlk onaylayıcıyı belirle (alttan üste doğru - chain'in ilk elemanı en alt yönetici)
      if (approvalChain.length > 0) {
        currentApprover = approvalChain[0]; // İlk yönetici (en alt seviye)
        initialStatus = 'IN_PROGRESS';
      } else {
        // Onay zinciri boş
        if (leaveApprovalSettings.requireApproval && !leaveApprovalSettings.autoApproveIfNoApprover) {
          // Onay gerekli ama onaylayıcı yok - PENDING'de bekle
          initialStatus = 'PENDING';
        } else if (leaveApprovalSettings.autoApproveIfNoApprover) {
          // Onaylayıcı yoksa otomatik onayla
          initialStatus = 'APPROVED';
        } else {
          // Onay gerekli değil - otomatik onayla
          initialStatus = 'APPROVED';
        }
      }
    } else if (!leaveApprovalSettings.enabled) {
      // Onay sistemi kapalı - direkt onayla
      initialStatus = 'APPROVED';
    } else {
      // Admin tarafından oluşturuluyorsa direkt approved
      initialStatus = 'APPROVED';
    }

    // İzin tipini al (type field için) - yukarıda zaten tanımlı
    // const leaveTypeName = leaveSubTypeDoc ? leaveSubTypeDoc.name : workingPermit.name;

    const leaveRequest = new LeaveRequest({
      employee: employee._id,
      company: company._id,
      companyLeaveType: workingPermit._id, // WorkingPermit ID'si
      leaveSubType: leaveSubTypeDoc ? leaveSubTypeDoc._id : null,
      type: leaveTypeName, // String olarak izin tipi (backward compatibility)
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      returnDate: calculatedReturnDate ? new Date(calculatedReturnDate) : null,
      startTime: startTime || null,
      endTime: endTime || null,
      isHalfDay: isHalfDay === 'true' || isHalfDay === true,
      halfDayPeriod: halfDayPeriod || null,
      isHourly: isHourly === 'true' || isHourly === true,
      hours: parseFloat(hours) || 0,
      totalDays,
      description,
      document: documentPath,
      status: initialStatus,
      currentApprover: currentApprover,
      isAdminCreated: isAdminCreated,
      createdByAdmin: isAdminCreated ? req.user._id : null,
      history: [] // Başlangıçta boş
    });

    await leaveRequest.save();

    // İlk onaylayıcı varsa history'ye ekle
    if (currentApprover && !isAdminCreated) {
      leaveRequest.history.push({
        approver: currentApprover,
        status: 'IN_PROGRESS',
        note: 'İzin talebi oluşturuldu, onay bekleniyor',
        date: new Date()
      });
      await leaveRequest.save();
    } else if (isAdminCreated) {
      // Admin tarafından oluşturulduysa history'ye ekle
      leaveRequest.history.push({
        approver: employee._id, // Çalışan kendisi (admin tarafından oluşturuldu)
        status: 'APPROVED',
        note: 'Admin tarafından oluşturuldu ve onaylandı',
        date: new Date()
      });
      await leaveRequest.save();
      
      // Admin tarafından oluşturulan yıllık izin için calculatedDays'i set et
      const leaveTypeName = (leaveSubTypeDoc ? leaveSubTypeDoc.name : workingPermit.name).toLowerCase();
      if (leaveTypeName.includes('yıllık') || leaveTypeName === 'yıllık izin') {
        // Pazar günü sayısını hesapla
        let sundayCount = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);
        
        while (current <= end) {
          if (current.getDay() === 0) { // 0 = Pazar
            sundayCount++;
          }
          current.setDate(current.getDate() + 1);
        }
        
        // calculatedDays = requestedDays - sundayCount (Pazar hariç)
        const totalCalendarDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const requestedDays = totalCalendarDays;
        leaveRequest.calculatedDays = requestedDays - sundayCount;
        await leaveRequest.save();
      }
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return createdResponse(res, { data: populated, message: 'İzin talebi başarıyla oluşturuldu' });
  } catch (error) {
    console.error('İzin talebi oluşturma hatası:', error);
    return serverError(res, error);
  }
});

// POST /api/leave-requests/:id/approve - Yönetici onaylar
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const { note } = req.body; // Opsiyonel not

    // Admin rolleri: company_admin, resmi_muhasebe_ik, bayi_admin, super_admin
    const isAdmin = ['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON', 'bayi_admin', 'super_admin'].includes(req.user.role.name);

    // Kullanıcının employee kaydını bul (admin'ler için zorunlu değil)
    const approverEmployee = await Employee.findOne({ email: req.user.email });

    // Admin değilse ve employee kaydı yoksa hata ver
    if (!approverEmployee && !isAdmin) {
      return notFound(res, 'Çalışan kaydı bulunamadı');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber approvalChain')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description');

    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Admin ise kendi şirketinin taleplerini onaylayabilir
    const isSameCompany = leaveRequest.company._id.toString() === req.user.company?.toString() ||
                          leaveRequest.company._id.toString() === req.user.company?._id?.toString();

    // Yetki kontrolü: currentApprover veya admin rolü
    const isCurrentApprover = approverEmployee && leaveRequest.currentApprover &&
                              leaveRequest.currentApprover.toString() === approverEmployee._id.toString();

    if (!isCurrentApprover && !(isAdmin && isSameCompany)) {
      return forbidden(res, 'Bu talebi onaylama yetkiniz yok');
    }

    // Status kontrolü
    if (leaveRequest.status === 'APPROVED') {
      return errorResponse(res, { message: 'Bu talep zaten onaylanmış' });
    }

    if (leaveRequest.status === 'REJECTED') {
      return errorResponse(res, { message: 'Bu talep reddedilmiş, onaylanamaz' });
    }

    // Employee'nin approvalChain'ini al (güncel olsun)
    const employee = await Employee.findById(leaveRequest.employee._id || leaveRequest.employee);
    let approvalChain = employee.approvalChain || [];

    // Eğer chain boşsa yeniden hesapla
    if (approvalChain.length === 0) {
      approvalChain = await calculateApprovalChain(employee._id);
    }

    // Mevcut onaylayıcının index'ini bul (alttan üste doğru - chain[0] en alt, chain[n] en üst)
    // Admin'ler için approverEmployee null olabilir
    const currentApproverIndex = approverEmployee
      ? approvalChain.findIndex(id => id.toString() === approverEmployee._id.toString())
      : -1;

    // Admin kontrolü: Şirket admin (veya diğer admin rolleri) chain'de olmasa bile onaylayabilir
    const canApproveAsAdmin = isAdmin && isSameCompany;

    if (currentApproverIndex === -1 && !canApproveAsAdmin) {
      return forbidden(res, 'Bu talebi onaylama yetkiniz yok');
    }

    // Admin olarak onaylıyorsa (chain'de değil veya Employee kaydı yok)
    const isApprovingAsAdmin = (currentApproverIndex === -1 || !approverEmployee) && canApproveAsAdmin;

    // Admin olarak onaylıyorsa direkt onayla (chain mantığını bypass et)
    if (isApprovingAsAdmin) {
      // History'ye ekle - admin için approverEmployee yoksa approverUser kullan
      leaveRequest.history.push({
        approver: approverEmployee?._id || null,
        approverUser: req.user._id, // Admin kullanıcısının User ID'si
        status: 'APPROVED',
        note: note || `${req.user.role.name} tarafından onaylandı`,
        date: new Date()
      });

      leaveRequest.status = 'APPROVED';
      leaveRequest.currentApprover = null;
    } else {
      // Normal onay akışı (chain üzerinden)
      // İzin türünün onay config'ini al
      const workingPermit = await WorkingPermit.findById(leaveRequest.companyLeaveType);
      const approvalConfig = workingPermit?.approvalConfig || { levels: 1 };

      // Gerekli onay seviyesine ulaşıldı mı kontrol et
      const approvedCount = leaveRequest.history.filter(h =>
        h.status === 'APPROVED' || h.status === 'IN_PROGRESS'
      ).length + 1; // +1 mevcut onay için

      let requiredLevels = approvalConfig.levels || 1;
      if (approvalConfig.minDaysForMultiApproval && leaveRequest.totalDays >= approvalConfig.minDaysForMultiApproval) {
        requiredLevels = Math.max(requiredLevels, 2);
      }

      // Sıradaki onaylayıcıyı bul (bir üst seviye - index + 1)
      let nextApprover = null;
      if (currentApproverIndex < approvalChain.length - 1) {
        nextApprover = approvalChain[currentApproverIndex + 1];
      }

      // Yeterli onay toplandı mı?
      const sufficientApprovals = approvedCount >= requiredLevels ||
                                   currentApproverIndex >= approvalChain.length - 1 ||
                                   approvalConfig.singleApprovalSufficient;

      // History'ye ekle
      leaveRequest.history.push({
        approver: approverEmployee?._id || null,
        approverUser: req.user._id,
        status: (sufficientApprovals || !nextApprover) ? 'APPROVED' : 'IN_PROGRESS',
        note: note || 'Onaylandı',
        date: new Date()
      });

      // Yeterli onay varsa veya sıradaki onaylayıcı yoksa APPROVED, yoksa IN_PROGRESS
      if (sufficientApprovals || !nextApprover) {
        leaveRequest.status = 'APPROVED';
        leaveRequest.currentApprover = null;
      } else {
        leaveRequest.status = 'IN_PROGRESS';
        leaveRequest.currentApprover = nextApprover;
      }
    }

    await leaveRequest.save();

    // Eğer onaylandıysa ve yıllık izin ise balance güncelle
    if (leaveRequest.status === 'APPROVED') {
      const leaveTypeName = (leaveRequest.leaveSubType?.name || leaveRequest.companyLeaveType?.name || leaveRequest.type || '').toLowerCase();
      if (leaveTypeName.includes('yıllık') || leaveRequest.type === 'Yıllık izin') {
        // Pazar günü sayısını hesapla
        let sundayCount = 0;
        const start = new Date(leaveRequest.startDate);
        const end = new Date(leaveRequest.endDate);
        const current = new Date(start);
        
        while (current <= end) {
          if (current.getDay() === 0) { // 0 = Pazar
            sundayCount++;
          }
          current.setDate(current.getDate() + 1);
        }
        
        // calculatedDays = requestedDays - sundayCount (Pazar hariç)
        // totalDays zaten pazar hariç hesaplanmış, ama kullanıcı açıkça sundayCount çıkarmamızı istiyor
        // Toplam gün sayısını hesapla (başlangıç ve bitiş dahil)
        const totalCalendarDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const requestedDays = totalCalendarDays;
        leaveRequest.calculatedDays = requestedDays - sundayCount;
        
        await leaveRequest.save();

        // İzin cetvelinde kayıt oluştur (bakiye otomatik güncellenir)
        await createLeaveUsedEntry(leaveRequest, leaveRequest.calculatedDays);
      }
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: nextApprover ? 'Onaylandı, sıradaki yöneticiye iletildi' : 'İzin talebi onaylandı',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST /api/leave-requests/:id/reject - Yönetici reddeder
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const { note } = req.body; // Zorunlu not

    if (!note || note.trim() === '') {
      return errorResponse(res, { message: 'Red nedeni (note) zorunludur' });
    }

    // Admin rolleri: company_admin, resmi_muhasebe_ik, bayi_admin, super_admin
    const isAdmin = ['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON', 'bayi_admin', 'super_admin'].includes(req.user.role.name);

    // Kullanıcının employee kaydını bul (admin'ler için zorunlu değil)
    const approverEmployee = await Employee.findOne({ email: req.user.email });

    // Admin değilse ve employee kaydı yoksa hata ver
    if (!approverEmployee && !isAdmin) {
      return notFound(res, 'Çalışan kaydı bulunamadı');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description');

    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Admin ise kendi şirketinin taleplerini reddedebilir
    const isSameCompany = leaveRequest.company._id.toString() === req.user.company?.toString() ||
                          leaveRequest.company._id.toString() === req.user.company?._id?.toString();

    // Yetki kontrolü: currentApprover veya admin rolü
    const isCurrentApprover = approverEmployee && leaveRequest.currentApprover &&
                              leaveRequest.currentApprover.toString() === approverEmployee._id.toString();

    if (!isCurrentApprover && !(isAdmin && isSameCompany)) {
      return forbidden(res, 'Bu talebi reddetme yetkiniz yok');
    }

    // Status kontrolü
    if (leaveRequest.status === 'APPROVED') {
      return errorResponse(res, { message: 'Bu talep zaten onaylanmış, reddedilemez' });
    }

    if (leaveRequest.status === 'REJECTED') {
      return errorResponse(res, { message: 'Bu talep zaten reddedilmiş' });
    }

    // History'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee?._id || null,
      approverUser: req.user._id, // Reddeden kullanıcının User ID'si
      status: 'REJECTED',
      note: note.trim(),
      date: new Date()
    });

    // Status ve rejectReason güncelle
    leaveRequest.status = 'REJECTED';
    leaveRequest.rejectReason = note.trim();
    leaveRequest.currentApprover = null; // Reddedildi, artık onaylayıcı yok

    await leaveRequest.save();

    // Tüm önceki onaylayıcıları ve çalışanı bilgilendir
    try {
      const User = require('../models/User');
      const employee = await Employee.findById(leaveRequest.employee._id || leaveRequest.employee);
      
      // Çalışanı bilgilendir
      if (employee && employee.email) {
        // Email gönderme işlemi burada yapılabilir
        console.log(`Red bildirimi gönderiliyor: ${employee.email}`);
      }

      // Önceki onaylayıcıları bilgilendir
      const previousApprovers = leaveRequest.history
        .filter(h => h.status === 'IN_PROGRESS' || h.status === 'APPROVED')
        .map(h => h.approver);

      for (const approverId of previousApprovers) {
        const approver = await Employee.findById(approverId);
        if (approver && approver.email) {
          // Email gönderme işlemi burada yapılabilir
          console.log(`Red bildirimi gönderiliyor (önceki onaylayıcı): ${approver.email}`);
        }
      }
    } catch (emailError) {
      console.error('Bildirim gönderme hatası:', emailError);
      // Email hatası onay işlemini engellemez
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İzin talebi reddedildi',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST /api/leave-requests/:id/suspend - İzin talebini askıya al
router.post('/:id/suspend', auth, async (req, res) => {
  try {
    const { note } = req.body; // Opsiyonel not

    // Yetki kontrolü - sadece yöneticiler askıya alabilir
    if (!['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'BAYI_ADMIN', 'SUPER_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    // Kullanıcının employee kaydını bul
    const approverEmployee = await Employee.findOne({ email: req.user.email });
    if (!approverEmployee) {
      return notFound(res, 'Çalışan kaydı bulunamadı');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company')
      .populate('companyLeaveType', 'name description')
      .populate('leaveSubType', 'name description');

    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Şirket/Bayi yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      if (leaveRequest.company._id.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Bu şirkete ait talepleri askıya alma yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      const company = await Company.findById(leaveRequest.company._id || leaveRequest.company);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res, 'Bu bayinin taleplerini askıya alma yetkiniz yok');
      }
    }

    // Status kontrolü
    if (leaveRequest.status === 'APPROVED') {
      return errorResponse(res, { message: 'Onaylanmış izin talebi askıya alınamaz' });
    }

    if (leaveRequest.status === 'REJECTED') {
      return errorResponse(res, { message: 'Reddedilmiş izin talebi askıya alınamaz' });
    }

    if (leaveRequest.status === 'CANCELLED') {
      return errorResponse(res, { message: 'İptal edilmiş izin talebi askıya alınamaz' });
    }

    // History'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee._id,
      status: 'SUSPENDED',
      note: note || 'İzin talebi askıya alındı',
      date: new Date()
    });

    // Status güncelle
    leaveRequest.status = 'SUSPENDED';
    // currentApprover'ı koru, askıya alındıktan sonra devam edebilir

    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İzin talebi askıya alındı',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST /api/leave-requests/:id/resume - Askıya alınan izin talebini devam ettir
router.post('/:id/resume', auth, async (req, res) => {
  try {
    // Yetki kontrolü - sadece yöneticiler devam ettirebilir
    if (!['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'BAYI_ADMIN', 'SUPER_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      return forbidden(res, 'Bu işlem için yetkiniz yok');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber approvalChain')
      .populate('company');

    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    if (leaveRequest.status !== 'SUSPENDED') {
      return errorResponse(res, { message: 'Sadece askıya alınmış talepler devam ettirilebilir' });
    }

    // Şirket/Bayi yetki kontrolü
    if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      if (leaveRequest.company._id.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Bu şirkete ait talepleri devam ettirme yetkiniz yok');
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      const company = await Company.findById(leaveRequest.company._id || leaveRequest.company);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res, 'Bu bayinin taleplerini devam ettirme yetkiniz yok');
      }
    }

    // Kullanıcının employee kaydını bul
    const approverEmployee = await Employee.findOne({ email: req.user.email });
    if (!approverEmployee) {
      return notFound(res, 'Çalışan kaydı bulunamadı');
    }

    // Approval chain'i kontrol et
    const employee = await Employee.findById(leaveRequest.employee._id || leaveRequest.employee);
    let approvalChain = employee.approvalChain || [];
    
    if (approvalChain.length === 0) {
      approvalChain = await calculateApprovalChain(employee._id);
    }

    // Eğer currentApprover varsa, o seviyeden devam et
    // Yoksa, approval chain'in başından devam et
    let nextApprover = leaveRequest.currentApprover;
    let nextStatus = 'IN_PROGRESS';

    if (!nextApprover && approvalChain.length > 0) {
      nextApprover = approvalChain[0];
    }

    if (!nextApprover) {
      nextStatus = 'APPROVED';
    }

    // History'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee._id,
      status: nextStatus,
      note: 'İzin talebi askıdan çıkarıldı ve devam ettirildi',
      date: new Date()
    });

    // Status güncelle
    leaveRequest.status = nextStatus;
    leaveRequest.currentApprover = nextApprover;

    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description')
      .populate('leaveSubType', 'name description')
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İzin talebi devam ettirildi',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Approve/Reject leave request (Eski endpoint - geriye dönük uyumluluk için)
router.put('/:id/review', auth, requireRole('super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { status, rejectedReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return errorResponse(res, { message: 'Geçersiz durum' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description');

    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Check access
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== leaveRequest.company._id.toString()) {
      return forbidden(res);
    }

    if (status === 'rejected' && !rejectedReason) {
      return errorResponse(res, { message: 'Red nedeni gereklidir' });
    }

    leaveRequest.status = status;
    leaveRequest.rejectedReason = status === 'rejected' ? rejectedReason : null;
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewedAt = new Date();

    await leaveRequest.save();

    // If approved and is annual leave, update balance
    // Not: İzin bakiyesi artık LeaveLedger üzerinden otomatik takip ediliyor
    // updateLeaveBalance kaldırıldı - createLeaveUsedEntry kullanılıyor

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description')
      .populate('reviewedBy');

    res.json(populated);
  } catch (error) {
    return serverError(res, error);
  }
});

// Update leave request (only pending requests)
router.put('/:id', auth, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    if (leaveRequest.status !== 'pending') {
      return errorResponse(res, { message: 'Sadece bekleyen talepler düzenlenebilir' });
    }

    // Check access
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== leaveRequest.employee.toString()) {
        return forbidden(res);
      }
    }

    // Update allowed fields
    const allowedFields = ['startDate', 'endDate', 'returnDate', 'startTime', 'endTime', 'isHalfDay', 
                          'halfDayPeriod', 'isHourly', 'hours', 'description'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'startDate' || field === 'endDate' || field === 'returnDate') {
          leaveRequest[field] = new Date(req.body[field]);
        } else {
          leaveRequest[field] = req.body[field];
        }
      }
    });

    // Recalculate total days if dates changed
    if (req.body.startDate || req.body.endDate || req.body.returnDate) {
      const employee = await Employee.findById(leaveRequest.employee);
      let calculatedEndDate = leaveRequest.endDate;
      if (leaveRequest.returnDate) {
        calculatedEndDate = leaveRequest.returnDate;
      } else if (req.body.returnDate) {
        calculatedEndDate = new Date(req.body.returnDate);
      } else if (req.body.endDate) {
        calculatedEndDate = new Date(req.body.endDate);
      }
      
      leaveRequest.totalDays = await calculateLeaveDays(
        leaveRequest.startDate,
        calculatedEndDate,
        employee,
        Department,
        Company,
        leaveRequest.isHalfDay,
        leaveRequest.isHourly,
        leaveRequest.hours
      );
    }

    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee')
      .populate('company')
      .populate('companyLeaveType', 'name description isOtherCategory')
      .populate('leaveSubType', 'name description');

    res.json(populated);
  } catch (error) {
    return serverError(res, error);
  }
});

// Not: Eski hard delete route'u kaldırıldı
// Soft delete için dosyanın sonundaki DELETE route kullanılıyor

// Not: updateLeaveBalance fonksiyonu kaldırıldı
// İzin bakiyesi artık LeaveLedger üzerinden takip ediliyor
// createLeaveUsedEntry ve getEmployeeLeaveBalance fonksiyonları kullanılıyor

// Check for leave conflicts
async function checkLeaveConflicts(employeeId, startDate, endDate, excludeRequestId = null, newCompanyLeaveTypeId = null) {
  const LeaveRequest = require('../models/LeaveRequest');
  const CompanyLeaveType = require('../models/CompanyLeaveType');
  const LeaveSubType = require('../models/LeaveSubType');
  
  // Get new leave type name if provided
  let newLeaveTypeName = '';
  if (newCompanyLeaveTypeId) {
    const newCompanyLeaveType = await CompanyLeaveType.findById(newCompanyLeaveTypeId)
      .populate('leaveSubType', 'name');
    if (newCompanyLeaveType) {
      newLeaveTypeName = (newCompanyLeaveType.leaveSubType?.name || newCompanyLeaveType.name)?.toLowerCase() || '';
    }
  }
  const isNewSickLeave = newLeaveTypeName.includes('rapor') || 
                         newLeaveTypeName.includes('istirahat') || 
                         newLeaveTypeName.includes('hastalık');
  const isNewAnnualLeave = newLeaveTypeName.includes('yıllık');
  
  // Find overlapping leave requests
  const overlapping = await LeaveRequest.find({
    employee: employeeId,
    status: { $in: ['PENDING', 'APPROVED', 'IN_PROGRESS'] },
    _id: excludeRequestId ? { $ne: excludeRequestId } : { $exists: true },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  })
    .populate('companyLeaveType', 'name')
    .populate('leaveSubType', 'name');

  if (overlapping.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  // Check if there's a conflict between annual leave and sick leave
  const conflicts = [];
  for (const overlap of overlapping) {
    const leaveTypeName = (overlap.leaveSubType?.name || overlap.companyLeaveType?.name || overlap.type)?.toLowerCase() || '';
    const isSickLeave = leaveTypeName.includes('rapor') || 
                        leaveTypeName.includes('istirahat') || 
                        leaveTypeName.includes('hastalık');
    const isAnnualLeave = leaveTypeName.includes('yıllık');
    
    // Check conflict: new annual leave with existing sick leave
    if (isNewAnnualLeave && isSickLeave) {
      conflicts.push({
        request: overlap,
        type: 'sick_leave',
        message: 'Bu tarihlerde hastalık izni mevcut. Yıllık izin talebinizi düzeltmeniz gerekebilir. Hastalık raporu alındıysa, yıllık izin başlangıç ve bitiş tarihlerini yeni bir izin talebi ile düzeltmeniz gerekmektedir.'
      });
    }
    
    // Check conflict: new sick leave with existing annual leave
    if (isNewSickLeave && isAnnualLeave) {
      conflicts.push({
        request: overlap,
        type: 'annual_leave',
        message: 'Bu tarihlerde yıllık izin mevcut. Hastalık izni yıllık izin süresinden düşülmeyecektir. Yıllık izin tarihlerinizi düzeltmek için yeni bir izin talebi oluşturmanız gerekmektedir.'
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}

// POST /api/leave-requests/:id/cancel - Çalışan talebi iptal eder
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    // Kullanıcının employee kaydını bul
    const currentUserEmployee = await Employee.findOne({ email: req.user.email });
    if (!currentUserEmployee) {
      return notFound(res, 'Çalışan kaydı bulunamadı');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company')
      .populate('companyLeaveType', 'name description parentPermitId')
      .populate('leaveSubType', 'name description parentPermitId');

    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Sadece çalışan kendi talebini iptal edebilir
    if (leaveRequest.employee._id.toString() !== currentUserEmployee._id.toString()) {
      return forbidden(res, 'Bu talebi iptal etme yetkiniz yok');
    }

    // Status kontrolü
    if (leaveRequest.status === 'APPROVED') {
      return errorResponse(res, { message: 'Onaylanmış talepler iptal edilemez. Lütfen yöneticiniz ile iletişime geçin.' });
    }

    if (leaveRequest.status === 'CANCELLED') {
      return errorResponse(res, { message: 'Bu talep zaten iptal edilmiş' });
    }

    if (leaveRequest.status === 'REJECTED') {
      return errorResponse(res, { message: 'Reddedilmiş talepler iptal edilemez' });
    }

    // Henüz işlem görmediyse (PENDING ve currentApprover yok veya history boş) → direkt CANCELLED
    // Onaya düştüyse (PENDING veya IN_PROGRESS ve currentApprover var) → CANCELLATION_REQUESTED
    if ((leaveRequest.status === 'PENDING' && !leaveRequest.currentApprover && (!leaveRequest.history || leaveRequest.history.length === 0))) {
      // Henüz işlem görmediyse direkt iptal et
      leaveRequest.status = 'CANCELLED';
      leaveRequest.currentApprover = null;

      // History'ye ekle
      leaveRequest.history.push({
        approver: currentUserEmployee._id,
        status: 'CANCELLED',
        note: 'Çalışan tarafından iptal edildi',
        date: new Date()
      });

      await leaveRequest.save();
    } else if (leaveRequest.status === 'PENDING' || leaveRequest.status === 'IN_PROGRESS') {
      // Onaya düştüyse iptal talebi oluştur
      leaveRequest.status = 'CANCELLATION_REQUESTED';
      // currentApprover'ı koru, çünkü admin/yönetici bu talebi onaylamalı

      // History'ye ekle
      leaveRequest.history.push({
        approver: currentUserEmployee._id,
        status: 'CANCELLATION_REQUESTED',
        note: 'Çalışan tarafından iptal talebi oluşturuldu',
        date: new Date()
      });

      await leaveRequest.save();
    } else {
      return errorResponse(res, { message: 'Bu talep durumu iptal edilemez' });
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: leaveRequest.status === 'CANCELLED' ? 'İzin talebi iptal edildi' : 'İptal talebi oluşturuldu, yönetici onayı bekleniyor',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST /api/leave-requests/:id/request-cancellation - Çalışan onaylanmış izin için iptal talebi gönderir
router.post('/:id/request-cancellation', auth, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return errorResponse(res, { message: 'İptal nedeni zorunludur' });
    }

    // Kullanıcının employee kaydını bul
    const currentUserEmployee = await Employee.findOne({ email: req.user.email });
    if (!currentUserEmployee) {
      return notFound(res, 'Çalışan kaydı bulunamadı');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber approvalChain')
      .populate('company')
      .populate('companyLeaveType', 'name description parentPermitId')
      .populate('leaveSubType', 'name description parentPermitId');

    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Sadece çalışan kendi talebini iptal edebilir
    if (leaveRequest.employee._id.toString() !== currentUserEmployee._id.toString()) {
      return forbidden(res, 'Bu talebi iptal etme yetkiniz yok');
    }

    // Sadece APPROVED durumundaki talepler için çalışır
    if (leaveRequest.status !== 'APPROVED') {
      return errorResponse(res, { message: 'Sadece onaylanmış izinler için iptal talebi gönderilebilir' });
    }

    // İzin bitiş tarihinden itibaren 6 ay içinde iptal talebi gönderilebilir
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(leaveRequest.endDate);
    endDate.setHours(0, 0, 0, 0);

    // 6 ay öncesinin tarihini hesapla
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    if (endDate < sixMonthsAgo) {
      return errorResponse(res, { message: 'İzin bitiş tarihinden itibaren 6 aydan fazla süre geçmiş izinler için iptal talebi gönderilemez' });
    }

    // Onay zincirini al (aynı onay zinciri kullanılacak)
    const employee = await Employee.findById(leaveRequest.employee._id || leaveRequest.employee);
    let approvalChain = employee.approvalChain || [];

    // Eğer chain boşsa yeniden hesapla
    if (approvalChain.length === 0) {
      approvalChain = await calculateApprovalChain(employee._id);
    }

    // İlk onaylayıcıyı belirle
    let cancellationCurrentApprover = null;
    if (approvalChain.length > 0) {
      cancellationCurrentApprover = approvalChain[0];
    }

    // İptal talebi bilgilerini kaydet
    leaveRequest.status = 'CANCELLATION_REQUESTED';
    leaveRequest.cancellationReason = reason.trim();
    leaveRequest.cancellationRequestedAt = new Date();
    leaveRequest.cancellationRequestedBy = currentUserEmployee._id;
    leaveRequest.cancellationCurrentApprover = cancellationCurrentApprover;

    // Cancellation history'ye ekle
    leaveRequest.cancellationHistory.push({
      approver: currentUserEmployee._id,
      status: 'PENDING',
      note: `İptal talebi gönderildi: ${reason.trim()}`,
      date: new Date()
    });

    // Ana history'ye de ekle
    leaveRequest.history.push({
      approver: currentUserEmployee._id,
      status: 'CANCELLATION_REQUESTED',
      note: `İptal talebi gönderildi: ${reason.trim()}`,
      date: new Date()
    });

    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('currentApprover', 'firstName lastName email')
      .populate('cancellationCurrentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email')
      .populate('cancellationHistory.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İptal talebi gönderildi, onay bekleniyor',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST /api/leave-requests/:id/approve-cancellation - Admin/yönetici iptal talebini onaylar
router.post('/:id/approve-cancellation', auth, async (req, res) => {
  try {
    const { note } = req.body;

    // Admin rolleri
    const isAdmin = ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name);

    // Kullanıcının employee kaydını bul (admin'ler için zorunlu değil)
    const approverEmployee = await Employee.findOne({ email: req.user.email });

    // Admin değilse ve employee kaydı yoksa hata ver
    if (!approverEmployee && !isAdmin) {
      return notFound(res, 'Çalışan kaydı bulunamadı');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber department manager approvalChain')
      .populate('company')
      .populate('companyLeaveType', 'name description parentPermitId')
      .populate('leaveSubType', 'name description parentPermitId');

    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Sadece CANCELLATION_REQUESTED durumundaki talepler için çalışır
    if (leaveRequest.status !== 'CANCELLATION_REQUESTED') {
      return errorResponse(res, { message: 'Bu talep iptal talebi durumunda değil' });
    }

    // Admin ise kendi şirketinin taleplerini onaylayabilir
    const isSameCompany = leaveRequest.company._id.toString() === req.user.company?.toString() ||
                          leaveRequest.company._id.toString() === req.user.company?._id?.toString();

    // Yetki kontrolü: cancellationCurrentApprover veya currentApprover veya admin rolü
    const isCancellationApprover = approverEmployee && leaveRequest.cancellationCurrentApprover &&
                                    leaveRequest.cancellationCurrentApprover.toString() === approverEmployee._id.toString();
    const isCurrentApprover = approverEmployee && leaveRequest.currentApprover &&
                              leaveRequest.currentApprover.toString() === approverEmployee._id.toString();

    if (!isCancellationApprover && !isCurrentApprover && !(isAdmin && isSameCompany)) {
      return forbidden(res, 'İptal talebini onaylama yetkiniz yok');
    }

    // Onay zinciri kontrolü
    const employee = await Employee.findById(leaveRequest.employee._id || leaveRequest.employee);
    let approvalChain = employee.approvalChain || [];

    if (approvalChain.length === 0) {
      approvalChain = await calculateApprovalChain(employee._id);
    }

    // Mevcut onaylayıcının index'ini bul
    const currentApproverIndex = approverEmployee
      ? approvalChain.findIndex(id => id.toString() === approverEmployee._id.toString())
      : -1;

    // Admin kontrolü
    const canApproveAsAdmin = isAdmin && isSameCompany;
    const isApprovingAsAdmin = (currentApproverIndex === -1 || !approverEmployee) && canApproveAsAdmin;

    // Sıradaki onaylayıcıyı bul
    let nextApprover = null;
    if (!isApprovingAsAdmin && currentApproverIndex >= 0 && currentApproverIndex < approvalChain.length - 1) {
      nextApprover = approvalChain[currentApproverIndex + 1];
    }

    // Cancellation history'ye ekle
    leaveRequest.cancellationHistory.push({
      approver: approverEmployee?._id || null,
      approverUser: req.user._id,
      status: nextApprover ? 'PENDING' : 'APPROVED',
      note: note || 'İptal talebi onaylandı',
      date: new Date()
    });

    if (nextApprover && !isApprovingAsAdmin) {
      // Sıradaki onaylayıcıya geç
      leaveRequest.cancellationCurrentApprover = nextApprover;

      // Ana history'ye ekle
      leaveRequest.history.push({
        approver: approverEmployee?._id || null,
        approverUser: req.user._id,
        status: 'CANCELLATION_REQUESTED',
        note: note || 'İptal talebi onaylandı, sıradaki yöneticiye iletildi',
        date: new Date()
      });

      await leaveRequest.save();

      const populated = await LeaveRequest.findById(leaveRequest._id)
        .populate('employee', 'firstName lastName email employeeNumber')
        .populate('company', 'name')
        .populate({
          path: 'companyLeaveType',
          model: 'WorkingPermit',
          select: 'name description parentPermitId'
        })
        .populate({
          path: 'leaveSubType',
          model: 'WorkingPermit',
          select: 'name description parentPermitId',
          strictPopulate: false
        })
        .populate('currentApprover', 'firstName lastName email')
        .populate('cancellationCurrentApprover', 'firstName lastName email')
        .populate('history.approver', 'firstName lastName email')
        .populate('cancellationHistory.approver', 'firstName lastName email');

      return res.json({
        success: true,
        message: 'İptal talebi onaylandı, sıradaki yöneticiye iletildi',
        data: populated
      });
    }

    // Son onaylayıcı veya admin - iptal talebi tamamen onaylandı
    leaveRequest.status = 'CANCELLED';
    leaveRequest.currentApprover = null;
    leaveRequest.cancellationCurrentApprover = null;
    leaveRequest.cancellationApprovedAt = new Date();
    leaveRequest.cancellationApprovedBy = req.user._id;

    // Ana history'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee?._id || null,
      approverUser: req.user._id,
      status: 'CANCELLED',
      note: note || 'İptal talebi onaylandı, izin iptal edildi',
      date: new Date()
    });

    await leaveRequest.save();

    // İzin cetvelinde ters kayıt oluştur (iade) - sadece yıllık izin için
    const leaveTypeName = (leaveRequest.leaveSubType?.name || leaveRequest.companyLeaveType?.name || leaveRequest.type || '').toLowerCase();
    if (leaveTypeName.includes('yıllık') || leaveRequest.type === 'Yıllık izin') {
      await createLeaveReversalEntry(leaveRequest);
    }

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('currentApprover', 'firstName lastName email')
      .populate('cancellationCurrentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email')
      .populate('cancellationHistory.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İptal talebi onaylandı, izin talebi iptal edildi',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST /api/leave-requests/:id/reject-cancellation - Admin/yönetici iptal talebini reddeder
router.post('/:id/reject-cancellation', auth, async (req, res) => {
  try {
    const { note } = req.body;

    if (!note || note.trim() === '') {
      return errorResponse(res, { message: 'Red nedeni zorunludur' });
    }

    // Admin rolleri
    const isAdmin = ['company_admin', 'resmi_muhasebe_ik', 'super_admin', 'bayi_admin', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name);

    // Kullanıcının employee kaydını bul
    const approverEmployee = await Employee.findOne({ email: req.user.email });

    // Admin değilse ve employee kaydı yoksa hata ver
    if (!approverEmployee && !isAdmin) {
      return notFound(res, 'Çalışan kaydı bulunamadı');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company')
      .populate('companyLeaveType', 'name description parentPermitId')
      .populate('leaveSubType', 'name description parentPermitId');

    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Sadece CANCELLATION_REQUESTED durumundaki talepler için çalışır
    if (leaveRequest.status !== 'CANCELLATION_REQUESTED') {
      return errorResponse(res, { message: 'Bu talep iptal talebi durumunda değil' });
    }

    // Admin ise kendi şirketinin taleplerini reddedebilir
    const isSameCompany = leaveRequest.company._id.toString() === req.user.company?.toString() ||
                          leaveRequest.company._id.toString() === req.user.company?._id?.toString();

    // Yetki kontrolü
    const isCancellationApprover = approverEmployee && leaveRequest.cancellationCurrentApprover &&
                                    leaveRequest.cancellationCurrentApprover.toString() === approverEmployee._id.toString();
    const isCurrentApprover = approverEmployee && leaveRequest.currentApprover &&
                              leaveRequest.currentApprover.toString() === approverEmployee._id.toString();

    if (!isCancellationApprover && !isCurrentApprover && !(isAdmin && isSameCompany)) {
      return forbidden(res, 'İptal talebini reddetme yetkiniz yok');
    }

    // İptal talebi reddedildi - izin APPROVED durumuna geri döner
    leaveRequest.status = 'APPROVED';
    leaveRequest.cancellationCurrentApprover = null;

    // Cancellation history'ye ekle
    leaveRequest.cancellationHistory.push({
      approver: approverEmployee?._id || null,
      approverUser: req.user._id,
      status: 'REJECTED',
      note: note.trim(),
      date: new Date()
    });

    // Ana history'ye ekle
    leaveRequest.history.push({
      approver: approverEmployee?._id || null,
      approverUser: req.user._id,
      status: 'APPROVED',
      note: `İptal talebi reddedildi: ${note.trim()}`,
      date: new Date()
    });

    await leaveRequest.save();

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate({
        path: 'companyLeaveType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId'
      })
      .populate({
        path: 'leaveSubType',
        model: 'WorkingPermit',
        select: 'name description parentPermitId',
        strictPopulate: false
      })
      .populate('currentApprover', 'firstName lastName email')
      .populate('history.approver', 'firstName lastName email')
      .populate('cancellationHistory.approver', 'firstName lastName email');

    return res.json({
      success: true,
      message: 'İptal talebi reddedildi, izin geçerliliğini koruyor',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get leave days calculation endpoint
router.post('/calculate-days', auth, async (req, res) => {
  try {
    const { employeeId, startDate, returnDate, isHalfDay, isHourly, hours } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    // Check access
    if (req.user.role.name === 'employee') {
      const emp = await Employee.findOne({ email: req.user.email });
      if (!emp || emp._id.toString() !== employee._id.toString()) {
        return forbidden(res);
      }
    }

    const endDate = returnDate || startDate;
    const totalDays = await calculateLeaveDays(
      new Date(startDate),
      new Date(endDate),
      employee,
      Department,
      Company,
      isHalfDay === 'true' || isHalfDay === true,
      isHourly === 'true' || isHourly === true,
      parseFloat(hours) || 0
    );

    // Check for conflicts (need companyLeaveType for proper conflict detection)
    const conflictCheck = await checkLeaveConflicts(employeeId, new Date(startDate), new Date(endDate), null, req.body.companyLeaveType || null);

    res.json({
      totalDays,
      hasConflict: conflictCheck.hasConflict,
      conflicts: conflictCheck.conflicts
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET /api/leave-requests/reports/summary - İzin özet raporları
router.get('/reports/summary', auth, async (req, res) => {
  try {
    const { company, employee, startDate, endDate, year } = req.query;
    
    let query = {};
    let employeeQuery = {};

    // Rol bazlı erişim kontrolü
    if (req.user.role.name === 'employee') {
      const currentUserEmployee = await Employee.findOne({ email: req.user.email });
      if (!currentUserEmployee) {
        return notFound(res, 'Çalışan bulunamadı');
      }
      employeeQuery._id = currentUserEmployee._id;
    } else if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      if (company) {
        employeeQuery.company = company;
      } else {
        employeeQuery.company = req.user.company;
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      if (company) {
        const companyDoc = await Company.findById(company);
        if (!companyDoc || companyDoc.dealer.toString() !== req.user.dealer.toString()) {
          return forbidden(res);
        }
        employeeQuery.company = company;
      } else {
        const companies = await Company.find({ dealer: req.user.dealer });
        employeeQuery.company = { $in: companies.map(c => c._id) };
      }
    } else if (req.user.role.name === 'super_admin' || req.user.role.name === 'SUPER_ADMIN') {
      if (company) {
        employeeQuery.company = company;
      }
    } else {
      return forbidden(res);
    }

    // Çalışan filtresi
    if (employee) {
      employeeQuery._id = employee;
    }

    // Tarih filtresi
    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const dateStart = startDate ? new Date(startDate) : new Date(`${reportYear}-01-01`);
    const dateEnd = endDate ? new Date(endDate) : new Date(`${reportYear}-12-31T23:59:59`);

    query.startDate = { $lte: dateEnd };
    query.endDate = { $gte: dateStart };

    // Çalışanları bul
    const employees = await Employee.find(employeeQuery).select('_id firstName lastName email employeeNumber company');

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          totalEmployees: 0,
          totalEntitledDays: 0,
          totalUsedDays: 0,
          totalRemainingDays: 0
        }
      });
    }

    const employeeIds = employees.map(e => e._id);
    query.employee = { $in: employeeIds };

    // İzin taleplerini getir
    const leaveRequests = await LeaveRequest.find({
      ...query,
      status: 'APPROVED' // Sadece onaylanmış izinler
    })
      .populate('companyLeaveType', 'name')
      .populate('leaveSubType', 'name')
      .populate('employee', 'firstName lastName email employeeNumber');

    // İzin bakiyelerini LeaveLedger'dan hesapla
    const leaveBalances = [];
    for (const empId of employeeIds) {
      const balance = await getEmployeeLeaveBalance(empId);
      if (balance) {
        const emp = employees.find(e => e._id.toString() === empId.toString());
        leaveBalances.push({
          employee: emp,
          ...balance
        });
      }
    }

    // İzin türlerini topla (benzersiz)
    const allLeaveTypes = new Set();
    leaveRequests.forEach(leave => {
      const typeName = leave.leaveSubType?.name || leave.companyLeaveType?.name || leave.type || 'Diğer';
      allLeaveTypes.add(typeName);
    });

    // Yıllık izin türlerini belirle (hak edilen gösterilecek olanlar)
    const annualLeaveKeywords = ['yıllık', 'yillik', 'annual'];
    const isAnnualLeaveType = (typeName) => {
      const lowerName = (typeName || '').toLowerCase();
      return annualLeaveKeywords.some(kw => lowerName.includes(kw));
    };

    // Rapor verilerini oluştur
    const reportData = employees.map(emp => {
      const balance = leaveBalances.find(b => b.employee._id.toString() === emp._id.toString());
      const employeeLeaves = leaveRequests.filter(lr =>
        (lr.employee._id || lr.employee).toString() === emp._id.toString()
      );

      // Tür bazlı kullanım
      const typeUsage = {};
      let totalUsedDays = 0;
      let totalUsedHours = 0;

      employeeLeaves.forEach(leave => {
        const leaveTypeName = leave.leaveSubType?.name || leave.companyLeaveType?.name || leave.type || 'Diğer';
        const days = leave.isHourly ? (leave.hours / 8) : (leave.calculatedDays || leave.totalDays || 0);

        if (leave.isHourly) {
          totalUsedHours += leave.hours || 0;
        } else {
          totalUsedDays += days;
        }

        if (!typeUsage[leaveTypeName]) {
          typeUsage[leaveTypeName] = {
            days: 0,
            hours: 0,
            count: 0,
            isAnnualLeave: isAnnualLeaveType(leaveTypeName)
          };
        }

        if (leave.isHourly) {
          typeUsage[leaveTypeName].hours += leave.hours || 0;
        } else {
          typeUsage[leaveTypeName].days += days;
        }
        typeUsage[leaveTypeName].count += 1;
      });

      const entitledDays = balance ? balance.annualLeaveDays : 0;
      const usedAnnualDays = balance ? balance.usedAnnualLeaveDays : 0;
      const remainingDays = balance ? balance.remainingAnnualLeaveDays : 0;

      // İzin türü bazlı detay
      const leaveTypeBreakdown = Object.keys(typeUsage).map(type => ({
        type,
        entitledDays: typeUsage[type].isAnnualLeave ? entitledDays : null, // Sadece yıllık izin için hak edilen
        usedDays: typeUsage[type].days,
        usedHours: typeUsage[type].hours,
        remainingDays: typeUsage[type].isAnnualLeave ? remainingDays : null,
        count: typeUsage[type].count,
        isAnnualLeave: typeUsage[type].isAnnualLeave
      }));

      // Eğer yıllık izin kullanılmamış ama hakkı varsa ekle
      const hasAnnualLeaveType = leaveTypeBreakdown.some(t => t.isAnnualLeave);
      if (!hasAnnualLeaveType && entitledDays > 0) {
        leaveTypeBreakdown.unshift({
          type: 'Yıllık İzin',
          entitledDays,
          usedDays: 0,
          usedHours: 0,
          remainingDays,
          count: 0,
          isAnnualLeave: true
        });
      }

      return {
        employee: {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          employeeNumber: emp.employeeNumber
        },
        entitledDays,
        usedDays: usedAnnualDays,
        remainingDays,
        totalUsedDays,
        totalUsedHours,
        leaveTypeBreakdown,
        typeUsage: Object.keys(typeUsage).map(type => ({
          type,
          days: typeUsage[type].days,
          hours: typeUsage[type].hours,
          count: typeUsage[type].count
        })),
        leaveCount: employeeLeaves.length
      };
    });

    // İzin türü bazlı özet
    const leaveTypeSummary = {};
    reportData.forEach(emp => {
      emp.leaveTypeBreakdown.forEach(lt => {
        if (!leaveTypeSummary[lt.type]) {
          leaveTypeSummary[lt.type] = {
            type: lt.type,
            totalEntitled: 0,
            totalUsedDays: 0,
            totalUsedHours: 0,
            totalRemaining: 0,
            employeeCount: 0,
            isAnnualLeave: lt.isAnnualLeave
          };
        }
        if (lt.entitledDays !== null) {
          leaveTypeSummary[lt.type].totalEntitled += lt.entitledDays;
        }
        leaveTypeSummary[lt.type].totalUsedDays += lt.usedDays;
        leaveTypeSummary[lt.type].totalUsedHours += lt.usedHours;
        if (lt.remainingDays !== null) {
          leaveTypeSummary[lt.type].totalRemaining += lt.remainingDays;
        }
        if (lt.count > 0) {
          leaveTypeSummary[lt.type].employeeCount += 1;
        }
      });
    });

    // Toplam özet
    const summary = {
      totalEmployees: reportData.length,
      totalEntitledDays: reportData.reduce((sum, r) => sum + r.entitledDays, 0),
      totalUsedDays: reportData.reduce((sum, r) => sum + r.usedDays, 0),
      totalRemainingDays: reportData.reduce((sum, r) => sum + r.remainingDays, 0),
      totalUsedHours: reportData.reduce((sum, r) => sum + r.totalUsedHours, 0),
      leaveTypes: Object.values(leaveTypeSummary),
      allLeaveTypes: Array.from(allLeaveTypes)
    };

    res.json({
      success: true,
      data: reportData,
      summary,
      filters: {
        year: reportYear,
        startDate: dateStart,
        endDate: dateEnd,
        company: company || null,
        employee: employee || null
      }
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// GET /api/leave-requests/reports/export - Excel/CSV export
router.get('/reports/export', auth, async (req, res) => {
  try {
    const { format = 'csv', company, employee, startDate, endDate, year } = req.query;

    // Yetki kontrolü
    if (!['super_admin', 'bayi_admin', 'company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'BAYI_ADMIN', 'SUPER_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      return forbidden(res);
    }

    // Rapor verilerini doğrudan burada hesapla (summary endpoint mantığını tekrarla)
    let query = {};
    let employeeQuery = {};

    // Rol bazlı erişim kontrolü
    if (['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON'].includes(req.user.role.name)) {
      if (company) {
        employeeQuery.company = company;
      } else {
        employeeQuery.company = req.user.company;
      }
    } else if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      if (company) {
        const companyDoc = await Company.findById(company);
        if (!companyDoc || companyDoc.dealer.toString() !== req.user.dealer.toString()) {
          return forbidden(res);
        }
        employeeQuery.company = company;
      } else {
        const companies = await Company.find({ dealer: req.user.dealer });
        employeeQuery.company = { $in: companies.map(c => c._id) };
      }
    }

    if (employee) {
      employeeQuery._id = employee;
    }

    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const dateStart = startDate ? new Date(startDate) : new Date(`${reportYear}-01-01`);
    const dateEnd = endDate ? new Date(endDate) : new Date(`${reportYear}-12-31T23:59:59`);

    query.startDate = { $lte: dateEnd };
    query.endDate = { $gte: dateStart };

    const employees = await Employee.find(employeeQuery).select('_id firstName lastName email employeeNumber company');
    if (employees.length === 0) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const employeeIds = employees.map(e => e._id);
    query.employee = { $in: employeeIds };

    const leaveRequests = await LeaveRequest.find({
      ...query,
      status: 'APPROVED'
    })
      .populate('companyLeaveType', 'name')
      .populate('leaveSubType', 'name')
      .populate('employee', 'firstName lastName email employeeNumber');

    // İzin bakiyelerini LeaveLedger'dan hesapla
    const leaveBalances = [];
    for (const empId of employeeIds) {
      const balance = await getEmployeeLeaveBalance(empId);
      if (balance) {
        const emp = employees.find(e => e._id.toString() === empId.toString());
        leaveBalances.push({
          employee: emp,
          ...balance
        });
      }
    }

    const reportData = employees.map(emp => {
      const balance = leaveBalances.find(b => b.employee?._id?.toString() === emp._id.toString());
      const employeeLeaves = leaveRequests.filter(lr => 
        (lr.employee._id || lr.employee).toString() === emp._id.toString()
      );

      const typeUsage = {};
      let totalUsedDays = 0;
      let totalUsedHours = 0;

      employeeLeaves.forEach(leave => {
        const leaveTypeName = (leave.leaveSubType?.name || leave.companyLeaveType?.name || leave.type || '').toLowerCase();
        const days = leave.isHourly ? (leave.hours / 8) : (leave.calculatedDays || leave.totalDays || 0);
        
        if (leave.isHourly) {
          totalUsedHours += leave.hours || 0;
        } else {
          totalUsedDays += days;
        }

        if (!typeUsage[leaveTypeName]) {
          typeUsage[leaveTypeName] = { days: 0, hours: 0, count: 0 };
        }

        if (leave.isHourly) {
          typeUsage[leaveTypeName].hours += leave.hours || 0;
        } else {
          typeUsage[leaveTypeName].days += days;
        }
        typeUsage[leaveTypeName].count += 1;
      });

      const entitledDays = balance ? balance.annualLeaveDays : 0;
      const usedAnnualDays = balance ? balance.usedAnnualLeaveDays : 0;
      const remainingDays = balance ? balance.remainingAnnualLeaveDays : 0;

      return {
        employee: {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          employeeNumber: emp.employeeNumber
        },
        entitledDays,
        usedDays: usedAnnualDays,
        remainingDays,
        totalUsedDays,
        totalUsedHours,
        leaveCount: employeeLeaves.length
      };
    });

    if (format === 'csv') {
      // CSV formatında döndür
      let csv = 'Çalışan Adı,Çalışan Soyadı,Email,Personel No,Hak Edilen Gün,Kullanılan Gün,Kalan Gün,Toplam Kullanılan Gün,Toplam Kullanılan Saat,İzin Sayısı\n';
      
      reportData.forEach(item => {
        csv += `"${item.employee.firstName}","${item.employee.lastName}","${item.employee.email}","${item.employee.employeeNumber || ''}",${item.entitledDays},${item.usedDays},${item.remainingDays},${item.totalUsedDays.toFixed(2)},${item.totalUsedHours.toFixed(2)},${item.leaveCount}\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="izin-raporu-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csv); // BOM ekle (Excel için UTF-8 desteği)
    } else {
      // JSON formatında döndür
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="izin-raporu-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        success: true,
        data: reportData,
        filters: { year: reportYear, startDate: dateStart, endDate: dateEnd, company: company || null, employee: employee || null }
      });
    }
  } catch (error) {
    return serverError(res, error);
  }
});

// DELETE /api/leave-requests/:id - İzin talebini sil (soft delete - sadece admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Sadece admin yetkisi kontrol et
    const allowedRoles = ['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON', 'bayi_admin', 'BAYI_ADMIN', 'super_admin'];
    if (!allowedRoles.includes(req.user.role.name)) {
      return forbidden(res, 'Bu işlem için yetkiniz bulunmamaktadır');
    }

    const { reason } = req.body;

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Şirket yetkisi kontrol et
    if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      const company = await Company.findById(leaveRequest.company);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res, 'Bu izin talebini silme yetkiniz yok');
      }
    } else if (req.user.role.name !== 'super_admin') {
      if (leaveRequest.company.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Bu izin talebini silme yetkiniz yok');
      }
    }

    // Zaten silinmiş mi kontrol et
    if (leaveRequest.isDeleted) {
      return errorResponse(res, { message: 'Bu izin talebi zaten silinmiş' });
    }

    // Soft delete uygula
    leaveRequest.isDeleted = true;
    leaveRequest.deletedAt = new Date();
    leaveRequest.deletedBy = req.user._id;
    leaveRequest.deleteReason = reason || null;

    // History'ye ekle
    leaveRequest.history.push({
      approverUser: req.user._id,
      status: leaveRequest.status,
      note: `Silindi${reason ? ': ' + reason : ''}`,
      date: new Date()
    });

    await leaveRequest.save();

    // İlgili LeaveLedger kayıtlarını da soft delete yap
    await LeaveLedger.updateMany(
      { leaveRequest: leaveRequest._id },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id,
        deleteReason: reason || 'İzin talebi silindi'
      }
    );

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description')
      .populate('leaveSubType', 'name description')
      .populate('deletedBy', 'email firstName lastName');

    return res.json({
      success: true,
      message: 'İzin talebi ve ilgili cetvel kayıtları silindi',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// POST /api/leave-requests/:id/restore - Silinmiş izin talebini geri al (sadece admin)
router.post('/:id/restore', auth, async (req, res) => {
  try {
    // Sadece admin yetkisi kontrol et
    const allowedRoles = ['company_admin', 'resmi_muhasebe_ik', 'SIRKET_ADMIN', 'IK_OPERASYON', 'bayi_admin', 'BAYI_ADMIN', 'super_admin'];
    if (!allowedRoles.includes(req.user.role.name)) {
      return forbidden(res, 'Bu işlem için yetkiniz bulunmamaktadır');
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return notFound(res, 'İzin talebi bulunamadı');
    }

    // Şirket yetkisi kontrol et
    if (req.user.role.name === 'bayi_admin' || req.user.role.name === 'BAYI_ADMIN') {
      const company = await Company.findById(leaveRequest.company);
      if (!company || company.dealer.toString() !== req.user.dealer.toString()) {
        return forbidden(res, 'Bu izin talebini geri alma yetkiniz yok');
      }
    } else if (req.user.role.name !== 'super_admin') {
      if (leaveRequest.company.toString() !== req.user.company.toString()) {
        return forbidden(res, 'Bu izin talebini geri alma yetkiniz yok');
      }
    }

    // Silinmiş mi kontrol et
    if (!leaveRequest.isDeleted) {
      return errorResponse(res, { message: 'Bu izin talebi silinmemiş' });
    }

    // Geri al
    leaveRequest.isDeleted = false;
    leaveRequest.deletedAt = null;
    leaveRequest.deletedBy = null;
    leaveRequest.deleteReason = null;

    // History'ye ekle
    leaveRequest.history.push({
      approverUser: req.user._id,
      status: leaveRequest.status,
      note: 'Silinen kayıt geri alındı',
      date: new Date()
    });

    await leaveRequest.save();

    // İlgili LeaveLedger kayıtlarını da geri al
    await LeaveLedger.updateMany(
      { leaveRequest: leaveRequest._id },
      {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
        deleteReason: null
      }
    );

    const populated = await LeaveRequest.findById(leaveRequest._id)
      .populate('employee', 'firstName lastName email employeeNumber')
      .populate('company', 'name')
      .populate('companyLeaveType', 'name description')
      .populate('leaveSubType', 'name description');

    return res.json({
      success: true,
      message: 'İzin talebi ve ilgili cetvel kayıtları geri alındı',
      data: populated
    });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

