const AdvanceRequest = require('../models/AdvanceRequest');
const AdvancePayment = require('../models/AdvancePayment');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const User = require('../models/User');

class AdvanceService {
  /**
   * Şirket avans kurallarını kontrol et
   */
  async validateAdvanceRequest(employeeId, companyId, amount, installments) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error('Çalışan bulunamadı');
    }

    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Şirket bulunamadı');
    }

    const settings = company.advanceSettings;

    // Avans sistemi aktif mi?
    if (!settings || !settings.enabled) {
      throw new Error('Avans talebi sistemi bu şirket için aktif değil');
    }

    // Minimum çalışma süresi kontrolü
    if (settings.minWorkMonths > 0) {
      const hireDate = employee.hireDate;
      if (!hireDate) {
        throw new Error('Çalışan işe giriş tarihi bulunamadı');
      }

      const monthsWorked = this.calculateMonthsWorked(hireDate);
      if (monthsWorked < settings.minWorkMonths) {
        throw new Error(`En az ${settings.minWorkMonths} ay çalışmış olmanız gerekiyor. Siz ${monthsWorked} ay çalıştınız.`);
      }
    }

    // Tarih kısıtlaması kontrolü
    if (settings.requestStartDay > 0) {
      const today = new Date();
      const dayOfMonth = today.getDate();
      if (dayOfMonth < settings.requestStartDay) {
        throw new Error(`Avans talebi ayın ${settings.requestStartDay}. gününden itibaren yapılabilir`);
      }
    }

    // Aylık talep limiti kontrolü
    if (settings.monthlyRequestLimit > 0) {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const monthlyRequests = await AdvanceRequest.countDocuments({
        employee: employeeId,
        requestDate: {
          $gte: currentMonth,
          $lt: nextMonth
        },
        status: { $ne: 'CANCELLED' }
      });

      if (monthlyRequests >= settings.monthlyRequestLimit) {
        throw new Error(`Bu ay en fazla ${settings.monthlyRequestLimit} avans talebi yapabilirsiniz`);
      }
    }

    // Maksimum tutar kontrolü
    if (settings.maxAmountType === 'FIXED' && amount > settings.maxAmountValue) {
      throw new Error(`Maksimum avans tutarı ${settings.maxAmountValue} TL'dir`);
    }

    if (settings.maxAmountType === 'PERCENTAGE') {
      const maxAmount = (employee.salary || 0) * (settings.maxAmountValue / 100);
      if (amount > maxAmount) {
        throw new Error(`Maksimum avans tutarı maaşınızın %${settings.maxAmountValue}'si (${maxAmount.toFixed(2)} TL) olabilir`);
      }
    }

    // Taksit kontrolü
    if (installments > 1 && !settings.allowInstallments) {
      throw new Error('Taksitli avans bu şirket için aktif değil');
    }

    if (installments > settings.maxInstallments) {
      throw new Error(`Maksimum ${settings.maxInstallments} taksit yapabilirsiniz`);
    }

    // Bekleyen veya onaylanmış avans var mı?
    const existingAdvance = await AdvanceRequest.findOne({
      employee: employeeId,
      status: { $in: ['PENDING', 'APPROVED'] }
    });

    if (existingAdvance) {
      throw new Error('Bekleyen veya ödenmemiş avans talebiniz bulunmaktadır');
    }

    return {
      valid: true,
      settings
    };
  }

  /**
   * Çalışma süresi hesapla (ay)
   */
  calculateMonthsWorked(hireDate) {
    const today = new Date();
    const hire = new Date(hireDate);

    let months = (today.getFullYear() - hire.getFullYear()) * 12;
    months -= hire.getMonth();
    months += today.getMonth();

    return months <= 0 ? 0 : months;
  }

  /**
   * Taksit tutarının net maaşın %25'ini geçmemesini kontrol et
   * @param {Object} employee - Çalışan bilgileri (salary alanı gerekli)
   * @param {Number} amount - Toplam avans tutarı
   * @param {Number} installments - Taksit sayısı
   * @returns {Object} { valid, error?, suggestions? }
   */
  validateInstallmentLimit(employee, amount, installments) {
    const netSalary = employee.salary || 0;

    // Maaş bilgisi yoksa kontrolü atla
    if (netSalary <= 0) {
      return { valid: true, warning: 'Çalışan maaş bilgisi bulunamadı, limit kontrolü yapılamadı' };
    }

    const maxDeduction = netSalary * 0.25; // %25 limit
    const installmentAmount = amount / installments;

    if (installmentAmount > maxDeduction) {
      // Minimum taksit sayısını hesapla
      const minInstallments = Math.ceil(amount / maxDeduction);

      // Mevcut taksit sayısıyla maksimum çekilebilir tutarı hesapla
      const maxAmountWithCurrentInstallments = maxDeduction * installments;

      return {
        valid: false,
        error: `Taksit tutarı (${installmentAmount.toFixed(2)} TL) net maaşın %25'ini (${maxDeduction.toFixed(2)} TL) geçemez.`,
        suggestions: {
          minInstallments,
          maxAmountWithCurrentInstallments: Math.floor(maxAmountWithCurrentInstallments * 100) / 100,
          currentInstallmentAmount: Math.round(installmentAmount * 100) / 100,
          maxDeductionPerMonth: Math.floor(maxDeduction * 100) / 100
        }
      };
    }

    return { valid: true };
  }

  /**
   * Ödeme planı oluştur
   */
  createPaymentSchedule(amount, installments, startMonth = null) {
    const schedule = [];
    const installmentAmount = amount / installments;

    let currentDate = startMonth ? new Date(startMonth) : new Date();
    currentDate.setDate(1); // Ayın ilk günü
    currentDate.setMonth(currentDate.getMonth() + 1); // Gelecek aydan başla

    for (let i = 0; i < installments; i++) {
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

      schedule.push({
        month,
        amount: installmentAmount,
        paid: false
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return schedule;
  }

  /**
   * Onay zinciri oluştur
   */
  async createApprovalChain(employeeId, companyId) {
    const employee = await Employee.findById(employeeId).populate('department');
    const chain = [];

    // 1. Departman yöneticisi
    if (employee.department) {
      const deptManager = await User.findOne({
        company: companyId,
        department: employee.department._id,
        role: 'department_manager'
      });

      if (deptManager) {
        chain.push({
          approver: deptManager._id,
          role: 'department_manager',
          status: 'PENDING'
        });
      }
    }

    // 2. İK yöneticisi
    const hrManager = await User.findOne({
      company: companyId,
      role: 'hr_manager'
    });

    if (hrManager) {
      chain.push({
        approver: hrManager._id,
        role: 'hr_manager',
        status: 'PENDING'
      });
    }

    // 3. Şirket yöneticisi (eğer önceki onaylayıcılar yoksa)
    if (chain.length === 0) {
      const companyAdmin = await User.findOne({
        company: companyId,
        role: 'company_admin'
      });

      if (companyAdmin) {
        chain.push({
          approver: companyAdmin._id,
          role: 'company_admin',
          status: 'PENDING'
        });
      }
    }

    return chain;
  }

  /**
   * Performans puanı hesapla (0-100)
   */
  calculatePerformanceScore(employee, advanceHistory) {
    let score = 100;

    // Onaylanmış ve zamanında ödenen avanslar için bonus
    const paidOnTimeCount = advanceHistory.filter(a =>
      a.status === 'APPROVED' && a.remainingAmount === 0
    ).length;

    // Her gecikmeli ödeme için ceza
    const latePaymentCount = advanceHistory.filter(a =>
      a.status === 'APPROVED' && a.remainingAmount > 0
    ).length;

    score += (paidOnTimeCount * 2); // +2 puan
    score -= (latePaymentCount * 5); // -5 puan

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Taksit ödemesi işle
   */
  async processPayment(advanceRequestId, month, userId) {
    const advanceRequest = await AdvanceRequest.findById(advanceRequestId);
    if (!advanceRequest) {
      throw new Error('Avans talebi bulunamadı');
    }

    if (advanceRequest.status !== 'APPROVED') {
      throw new Error('Sadece onaylanmış avanslar için ödeme yapılabilir');
    }

    // Ödeme planında ilgili ayı bul
    const scheduleIndex = advanceRequest.paymentSchedule.findIndex(s => s.month === month);
    if (scheduleIndex === -1) {
      throw new Error('Belirtilen ay ödeme planında bulunamadı');
    }

    const scheduleItem = advanceRequest.paymentSchedule[scheduleIndex];
    if (scheduleItem.paid) {
      throw new Error('Bu ay için ödeme zaten yapılmış');
    }

    // Ödeme kaydı oluştur
    const payment = new AdvancePayment({
      advanceRequest: advanceRequestId,
      employee: advanceRequest.employee,
      company: advanceRequest.company,
      month,
      amount: scheduleItem.amount,
      paid: true,
      paidDate: new Date(),
      paymentMethod: 'SALARY_DEDUCTION',
      processedBy: userId
    });

    await payment.save();

    // Ödeme planını güncelle
    advanceRequest.paymentSchedule[scheduleIndex].paid = true;
    advanceRequest.paymentSchedule[scheduleIndex].paidDate = new Date();
    advanceRequest.remainingAmount -= scheduleItem.amount;

    await advanceRequest.save();

    return payment;
  }
}

module.exports = new AdvanceService();
