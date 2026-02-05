/**
 * Devam Takip Hesaplama Servisi
 *
 * Giriş/çıkış kayıtlarından günlük çalışma saati, geç kalma,
 * erken çıkış ve fazla mesai hesaplamalarını yapar.
 */

const DailyAttendanceSummary = require('../models/DailyAttendanceSummary');
const AttendanceRule = require('../models/AttendanceRule');
const WorkingHours = require('../models/WorkingHours');
const Employee = require('../models/Employee');
const CheckIn = require('../models/CheckIn');

// Gün adları (WorkingHours modeli için)
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * "HH:MM" formatındaki string'i dakikaya çevirir
 */
function timeStringToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Date objesinden saat ve dakikayı dakika cinsinden alır
 */
function dateToMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Dakikayı "Xs Yd" formatına çevirir
 */
function formatMinutesToHoursAndMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}s ${mins}d`;
}

/**
 * Çalışanın mesai saatlerini getirir
 * Önce Employee'nin WorkingHours'una bakar, yoksa Company'nin AttendanceRule'una bakar
 */
async function getWorkSchedule(employee, date) {
  const dayOfWeek = date.getDay();
  const dayName = DAY_NAMES[dayOfWeek];

  // 1. Çalışanın kendi mesai takvimi var mı?
  if (employee.workingHours) {
    const workingHours = await WorkingHours.findById(employee.workingHours);
    if (workingHours && workingHours[dayName]) {
      const daySchedule = workingHours[dayName];
      if (!daySchedule.isWorking) {
        return { isWorkingDay: false };
      }

      // Öğle arası hesapla
      let lunchBreakMinutes = 0;
      if (daySchedule.lunchBreak?.start && daySchedule.lunchBreak?.end) {
        const lunchStart = timeStringToMinutes(daySchedule.lunchBreak.start);
        const lunchEnd = timeStringToMinutes(daySchedule.lunchBreak.end);
        lunchBreakMinutes = lunchEnd - lunchStart;
      }

      return {
        isWorkingDay: true,
        startTime: daySchedule.start,
        endTime: daySchedule.end,
        startMinutes: timeStringToMinutes(daySchedule.start),
        endMinutes: timeStringToMinutes(daySchedule.end),
        lunchBreakMinutes,
        lateToleranceMinutes: 15,
        earlyDepartureToleranceMinutes: 10
      };
    }
  }

  // 2. Şirketin AttendanceRule'u var mı?
  const attendanceRule = await AttendanceRule.findOne({
    company: employee.company,
    isActive: true,
    $or: [
      { department: employee.department },
      { department: null }
    ]
  }).sort({ department: -1 }); // Departman spesifik olanı önce al

  if (attendanceRule) {
    if (!attendanceRule.workingDays.includes(dayOfWeek)) {
      return { isWorkingDay: false };
    }

    return {
      isWorkingDay: true,
      startTime: attendanceRule.startTime,
      endTime: attendanceRule.endTime,
      startMinutes: timeStringToMinutes(attendanceRule.startTime),
      endMinutes: timeStringToMinutes(attendanceRule.endTime),
      lunchBreakMinutes: 60, // Varsayılan 1 saat öğle arası
      lateToleranceMinutes: attendanceRule.lateToleranceMinutes || 15,
      earlyDepartureToleranceMinutes: attendanceRule.earlyDepartureToleranceMinutes || 10
    };
  }

  // 3. Varsayılan değerler (Pazartesi-Cuma, 09:00-18:00)
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (!isWeekday) {
    return { isWorkingDay: false };
  }

  return {
    isWorkingDay: true,
    startTime: '09:00',
    endTime: '18:00',
    startMinutes: 9 * 60,
    endMinutes: 18 * 60,
    lunchBreakMinutes: 60,
    lateToleranceMinutes: 15,
    earlyDepartureToleranceMinutes: 10
  };
}

/**
 * Check-out sonrası çağrılan ana hesaplama fonksiyonu
 * DailyAttendanceSummary tablosunu oluşturur/günceller
 */
async function processCheckInOut(checkInRecord) {
  try {
    // Giriş ve çıkış saati yoksa işlem yapma
    if (!checkInRecord.checkInTime || !checkInRecord.checkOutTime) {
      console.log('CheckIn/Out eksik, hesaplama yapılmadı');
      return null;
    }

    // Çalışan bilgilerini al
    const employee = await Employee.findById(checkInRecord.employee);
    if (!employee) {
      console.log('Çalışan bulunamadı');
      return null;
    }

    // Tarihi normalize et (günün başlangıcı)
    const date = new Date(checkInRecord.date);
    date.setHours(0, 0, 0, 0);

    // Mesai saatlerini al
    const schedule = await getWorkSchedule(employee, date);

    // Hesaplamaları yap
    const checkInMinutes = dateToMinutes(checkInRecord.checkInTime);
    const checkOutMinutes = dateToMinutes(checkInRecord.checkOutTime);

    // Toplam çalışma süresi (öğle arası çıkarılır)
    let totalWorkMinutes = checkOutMinutes - checkInMinutes;
    if (schedule.lunchBreakMinutes && totalWorkMinutes > schedule.lunchBreakMinutes) {
      totalWorkMinutes -= schedule.lunchBreakMinutes;
    }
    totalWorkMinutes = Math.max(0, totalWorkMinutes);

    // Geç kalma hesaplama
    let lateMinutes = 0;
    if (schedule.isWorkingDay && schedule.startMinutes) {
      const toleratedStart = schedule.startMinutes + schedule.lateToleranceMinutes;
      if (checkInMinutes > toleratedStart) {
        lateMinutes = checkInMinutes - schedule.startMinutes;
      }
    }

    // Erken çıkış hesaplama
    let earlyDepartureMinutes = 0;
    if (schedule.isWorkingDay && schedule.endMinutes) {
      const toleratedEnd = schedule.endMinutes - schedule.earlyDepartureToleranceMinutes;
      if (checkOutMinutes < toleratedEnd) {
        earlyDepartureMinutes = schedule.endMinutes - checkOutMinutes;
      }
    }

    // Fazla mesai hesaplama (standart 8 saat = 480 dakika)
    const standardWorkMinutes = 480;
    let overtimeMinutes = 0;
    if (totalWorkMinutes > standardWorkMinutes) {
      overtimeMinutes = totalWorkMinutes - standardWorkMinutes;
    }

    // Durum belirleme
    let status = 'PRESENT';
    if (!schedule.isWorkingDay) {
      status = 'WEEKEND';
    } else if (lateMinutes > 0) {
      status = 'LATE';
    }

    // Beklenen giriş/çıkış saatlerini Date objesi olarak oluştur
    let expectedCheckIn = null;
    let expectedCheckOut = null;
    if (schedule.isWorkingDay) {
      expectedCheckIn = new Date(date);
      expectedCheckIn.setHours(
        Math.floor(schedule.startMinutes / 60),
        schedule.startMinutes % 60,
        0, 0
      );

      expectedCheckOut = new Date(date);
      expectedCheckOut.setHours(
        Math.floor(schedule.endMinutes / 60),
        schedule.endMinutes % 60,
        0, 0
      );
    }

    // DailyAttendanceSummary oluştur/güncelle
    const summary = await DailyAttendanceSummary.findOneAndUpdate(
      {
        employee: employee._id,
        date: date
      },
      {
        company: employee.company,
        checkInTime: checkInRecord.checkInTime,
        checkOutTime: checkInRecord.checkOutTime,
        expectedCheckIn,
        expectedCheckOut,
        totalWorkMinutes,
        lateMinutes,
        earlyDepartureMinutes,
        overtimeMinutes,
        status,
        checkInRecord: checkInRecord._id
      },
      {
        upsert: true,
        new: true
      }
    );

    console.log(`DailyAttendanceSummary oluşturuldu/güncellendi: ${employee.firstName} ${employee.lastName} - ${date.toLocaleDateString()}`);
    console.log(`  Toplam: ${formatMinutesToHoursAndMinutes(totalWorkMinutes)}, Geç: ${lateMinutes}dk, Erken: ${earlyDepartureMinutes}dk, Fazla Mesai: ${overtimeMinutes}dk`);

    return summary;
  } catch (error) {
    console.error('Devam hesaplama hatası:', error);
    throw error;
  }
}

/**
 * Belirli bir çalışanın belirli bir günü için hesaplama yapar
 */
async function calculateDailyAttendance(employeeId, date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const checkIn = await CheckIn.findOne({
    employee: employeeId,
    date: {
      $gte: targetDate,
      $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
    }
  });

  if (!checkIn) {
    // CheckIn kaydı yok, ABSENT durumu oluştur
    const employee = await Employee.findById(employeeId);
    if (!employee) return null;

    const schedule = await getWorkSchedule(employee, targetDate);

    // Beklenen saatleri hesapla
    let expectedCheckIn = null;
    let expectedCheckOut = null;
    if (schedule.isWorkingDay) {
      expectedCheckIn = new Date(targetDate);
      expectedCheckIn.setHours(
        Math.floor(schedule.startMinutes / 60),
        schedule.startMinutes % 60,
        0, 0
      );

      expectedCheckOut = new Date(targetDate);
      expectedCheckOut.setHours(
        Math.floor(schedule.endMinutes / 60),
        schedule.endMinutes % 60,
        0, 0
      );
    }

    const summary = await DailyAttendanceSummary.findOneAndUpdate(
      {
        employee: employeeId,
        date: targetDate
      },
      {
        company: employee.company,
        expectedCheckIn,
        expectedCheckOut,
        status: schedule.isWorkingDay ? 'ABSENT' : 'WEEKEND',
        totalWorkMinutes: 0,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        overtimeMinutes: 0
      },
      {
        upsert: true,
        new: true
      }
    );

    return summary;
  }

  return processCheckInOut(checkIn);
}

/**
 * Bir çalışanın aylık özetini hesaplar
 */
async function calculateMonthlyAttendance(employeeId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Ayın son günü

  const summaries = await DailyAttendanceSummary.find({
    employee: employeeId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });

  // Toplam değerleri hesapla
  let totalWorkMinutes = 0;
  let totalLateMinutes = 0;
  let totalEarlyDepartureMinutes = 0;
  let totalOvertimeMinutes = 0;
  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let weekendDays = 0;

  for (const summary of summaries) {
    totalWorkMinutes += summary.totalWorkMinutes || 0;
    totalLateMinutes += summary.lateMinutes || 0;
    totalEarlyDepartureMinutes += summary.earlyDepartureMinutes || 0;
    totalOvertimeMinutes += summary.overtimeMinutes || 0;

    switch (summary.status) {
      case 'PRESENT':
        presentDays++;
        break;
      case 'LATE':
        lateDays++;
        break;
      case 'ABSENT':
        absentDays++;
        break;
      case 'WEEKEND':
        weekendDays++;
        break;
    }
  }

  return {
    employee: employeeId,
    year,
    month,
    totalWorkMinutes,
    totalWorkHours: Math.round(totalWorkMinutes / 60 * 100) / 100,
    totalLateMinutes,
    totalEarlyDepartureMinutes,
    totalOvertimeMinutes,
    totalOvertimeHours: Math.round(totalOvertimeMinutes / 60 * 100) / 100,
    presentDays,
    lateDays,
    absentDays,
    weekendDays,
    summaries
  };
}

/**
 * Bir şirketin belirli bir günü için tüm çalışanların özetini getirir
 */
async function getCompanyDailySummary(companyId, date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const summaries = await DailyAttendanceSummary.find({
    company: companyId,
    date: targetDate
  })
    .populate('employee', 'firstName lastName employeeNumber department')
    .populate('checkInRecord')
    .sort({ 'employee.firstName': 1 });

  // İstatistikleri hesapla
  const stats = {
    total: summaries.length,
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    weekend: 0
  };

  for (const summary of summaries) {
    switch (summary.status) {
      case 'PRESENT':
        stats.present++;
        break;
      case 'LATE':
        stats.late++;
        break;
      case 'ABSENT':
        stats.absent++;
        break;
      case 'ON_LEAVE':
        stats.onLeave++;
        break;
      case 'WEEKEND':
      case 'HOLIDAY':
        stats.weekend++;
        break;
    }
  }

  return {
    date: targetDate,
    stats,
    summaries
  };
}

/**
 * Bir şirketin tüm çalışanları için belirli bir günün hesaplamasını yapar
 */
async function recalculateCompanyDaily(companyId, date) {
  const employees = await Employee.find({
    company: companyId,
    isActive: true
  });

  const results = [];
  for (const employee of employees) {
    const summary = await calculateDailyAttendance(employee._id, date);
    results.push(summary);
  }

  return results;
}

module.exports = {
  processCheckInOut,
  calculateDailyAttendance,
  calculateMonthlyAttendance,
  getCompanyDailySummary,
  recalculateCompanyDaily,
  getWorkSchedule,
  formatMinutesToHoursAndMinutes
};
