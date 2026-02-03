const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const CompanyLeaveType = require('../models/CompanyLeaveType');
const Employee = require('../models/Employee');
const WorkingHours = require('../models/WorkingHours');
const CompanyHolidayCalendar = require('../models/CompanyHolidayCalendar');
const Company = require('../models/Company');
const AttendanceTemplate = require('../models/AttendanceTemplate');
const AttendanceTemplateItem = require('../models/AttendanceTemplateItem');

/**
 * Şirketin aktif puantaj şablonundaki kodları getirir
 * @param {String} companyId - Şirket ID'si
 * @returns {Object} Sistem tiplerine göre kodlar
 */
async function getTemplateCodesForCompany(companyId) {
  // Varsayılan kodlar
  const defaultCodes = {
    NOT_EMPLOYED: { code: '-', description: 'İşe başlamadan önce / İşten çıktıktan sonra', color: '#9CA3AF' },
    NORMAL_WORK: { code: 'N', description: 'Normal Çalışma', color: '#10B981' },
    WEEKEND: { code: 'H', description: 'Hafta Tatili', color: '#3B82F6' },
    PUBLIC_HOLIDAY: { code: 'T', description: 'Resmi Tatil', color: '#EF4444' },
    ANNUAL_LEAVE: { code: 'S', description: 'Yıllık İzin', color: '#8B5CF6' },
    SICK_LEAVE: { code: 'R', description: 'Rapor / Hastalık İzni', color: '#F59E0B' },
    UNPAID_LEAVE: { code: 'U', description: 'Ücretsiz İzin', color: '#EC4899' },
    OTHER_LEAVE: { code: 'D', description: 'Diğer İzinler', color: '#6366F1' }
  };

  try {
    // Şirketin aktif şablonunu bul
    const company = await Company.findById(companyId).select('activeAttendanceTemplate');
    let templateId = company?.activeAttendanceTemplate;

    // Şirketin şablonu yoksa varsayılan şablonu kullan
    if (!templateId) {
      const defaultTemplate = await AttendanceTemplate.findOne({ isDefault: true });
      if (defaultTemplate) {
        templateId = defaultTemplate._id;
      }
    }

    if (!templateId) {
      return defaultCodes;
    }

    // Şablondaki tüm kodları al
    const items = await AttendanceTemplateItem.find({ template: templateId });

    // Sistem tipine göre kodları eşleştir
    items.forEach(item => {
      if (item.systemType && defaultCodes[item.systemType]) {
        defaultCodes[item.systemType] = {
          code: item.code,
          description: item.description,
          color: item.color
        };
      }
    });

    return defaultCodes;
  } catch (error) {
    console.error('Şablon kodları alınırken hata:', error);
    return defaultCodes;
  }
}

/**
 * İzin onaylandığında ilgili günler için Attendance kayıtları oluşturur
 * @param {String} leaveRequestId - LeaveRequest ID'si
 * @param {String} userId - İşlemi yapan kullanıcı ID'si
 */
async function createAttendanceFromLeave(leaveRequestId, userId) {
  try {
    const leaveRequest = await LeaveRequest.findById(leaveRequestId)
      .populate('employee')
      .populate({
        path: 'companyLeaveType',
        populate: { path: 'leaveType' }
      });

    if (!leaveRequest) {
      throw new Error('İzin talebi bulunamadı');
    }

    // İzin türünün puantaj kodunu al
    let attendanceCode = 'I'; // Varsayılan: İzin
    let description = leaveRequest.type || 'İzin';

    if (leaveRequest.companyLeaveType) {
      // CompanyLeaveType üzerinden LeaveType'a git
      if (leaveRequest.companyLeaveType.leaveType && leaveRequest.companyLeaveType.leaveType.attendanceCode) {
        attendanceCode = leaveRequest.companyLeaveType.leaveType.attendanceCode;
      } else {
        // Doğrudan LeaveType'ı bul
        const leaveType = await LeaveType.findById(leaveRequest.companyLeaveType.leaveType);
        if (leaveType && leaveType.attendanceCode) {
          attendanceCode = leaveType.attendanceCode;
        }
      }
      description = leaveRequest.companyLeaveType.name || description;
    }

    // Tarih aralığındaki her gün için Attendance kaydı oluştur
    const startDate = new Date(leaveRequest.startDate);
    const endDate = new Date(leaveRequest.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const attendanceRecords = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = new Date(currentDate);
      dateKey.setHours(0, 0, 0, 0);

      // Mevcut kayıt var mı kontrol et
      const existing = await Attendance.findOne({
        employee: leaveRequest.employee._id,
        date: dateKey
      });

      if (existing) {
        // Mevcut kaydı güncelle
        existing.code = attendanceCode;
        existing.description = description;
        existing.notes = `İzin talebi: ${leaveRequest._id}`;
        existing.createdBy = userId;
        await existing.save();
        attendanceRecords.push(existing);
      } else {
        // Yeni kayıt oluştur
        const attendance = new Attendance({
          employee: leaveRequest.employee._id,
          company: leaveRequest.company,
          date: dateKey,
          code: attendanceCode,
          description: description,
          workingHours: 0, // İzinli
          overtime: 0,
          notes: `İzin talebi: ${leaveRequest._id}`,
          createdBy: userId
        });
        await attendance.save();
        attendanceRecords.push(attendance);
      }

      // Sonraki güne geç
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      success: true,
      message: `${attendanceRecords.length} gün için puantaj kaydı oluşturuldu`,
      records: attendanceRecords
    };
  } catch (error) {
    console.error('Puantaj kaydı oluşturulurken hata:', error);
    throw error;
  }
}

/**
 * İzin iptal edildiğinde ilgili Attendance kayıtlarını siler
 * @param {String} leaveRequestId - LeaveRequest ID'si
 */
async function removeAttendanceFromLeave(leaveRequestId) {
  try {
    const result = await Attendance.deleteMany({
      notes: `İzin talebi: ${leaveRequestId}`
    });

    return {
      success: true,
      message: `${result.deletedCount} puantaj kaydı silindi`
    };
  } catch (error) {
    console.error('Puantaj kaydı silinirken hata:', error);
    throw error;
  }
}

/**
 * Belirli bir ay için çalışanların puantaj takvimini oluşturur/günceller
 * WorkingHours'a göre varsayılan kodları doldurur (şablondan okur)
 * @param {String} companyId - Şirket ID'si
 * @param {Number} month - Ay (1-12)
 * @param {Number} year - Yıl
 * @param {String} userId - İşlemi yapan kullanıcı ID'si
 */
async function generateMonthlyAttendance(companyId, month, year, userId) {
  try {
    // Şablondan kodları al
    const templateCodes = await getTemplateCodesForCompany(companyId);

    // Şirket çalışanlarını al
    const employees = await Employee.find({
      company: companyId,
      isActive: true
    }).populate('workingHours');

    if (employees.length === 0) {
      return { success: true, message: 'Aktif çalışan bulunamadı', records: 0 };
    }

    // Şirket tatil günlerini al
    const holidays = await CompanyHolidayCalendar.find({
      company: companyId,
      date: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0)
      }
    });
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));

    // Ayın günlerini hesapla
    const daysInMonth = new Date(year, month, 0).getDate();
    let totalRecords = 0;

    const dayMap = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };

    for (const employee of employees) {
      // İşe giriş tarihi
      const hireDate = employee.hireDate ? new Date(employee.hireDate) : null;
      if (hireDate) hireDate.setHours(0, 0, 0, 0);

      // İşten çıkış tarihi
      const exitDate = employee.exitDate ? new Date(employee.exitDate) : null;
      if (exitDate) exitDate.setHours(0, 0, 0, 0);

      // Çalışanın çalışma saatlerini al
      let workingHours = employee.workingHours;
      if (!workingHours) {
        // Varsayılan çalışma saatleri (Pazartesi-Cuma)
        workingHours = {
          monday: { isWorking: true },
          tuesday: { isWorking: true },
          wednesday: { isWorking: true },
          thursday: { isWorking: true },
          friday: { isWorking: true },
          saturday: { isWorking: false },
          sunday: { isWorking: false }
        };
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        currentDate.setHours(0, 0, 0, 0);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();
        const dayName = dayMap[dayOfWeek];

        // Mevcut kayıt var mı kontrol et
        const existing = await Attendance.findOne({
          employee: employee._id,
          date: currentDate
        });

        // Eğer zaten kayıt varsa (izin vs.), atla
        if (existing) {
          continue;
        }

        // Puantaj kodunu belirle
        let code, description;

        // İşe başlamadan önce mi?
        if (hireDate && currentDate < hireDate) {
          code = templateCodes.NOT_EMPLOYED.code;
          description = templateCodes.NOT_EMPLOYED.description;
        }
        // İşten çıktıktan sonra mı?
        else if (exitDate && currentDate > exitDate) {
          code = templateCodes.NOT_EMPLOYED.code;
          description = templateCodes.NOT_EMPLOYED.description;
        }
        // Resmi tatil mi?
        else if (holidayDates.has(dateStr)) {
          code = templateCodes.PUBLIC_HOLIDAY.code;
          description = templateCodes.PUBLIC_HOLIDAY.description;
        }
        // Hafta tatili mi?
        else if (workingHours[dayName] && !workingHours[dayName].isWorking) {
          code = templateCodes.WEEKEND.code;
          description = templateCodes.WEEKEND.description;
        }
        // Normal çalışma günü
        else {
          code = templateCodes.NORMAL_WORK.code;
          description = templateCodes.NORMAL_WORK.description;
        }

        // Yeni kayıt oluştur
        const attendance = new Attendance({
          employee: employee._id,
          company: companyId,
          date: currentDate,
          code: code,
          description: description,
          workingHours: code === templateCodes.NORMAL_WORK.code ? 8 : 0,
          overtime: 0,
          createdBy: userId
        });

        await attendance.save();
        totalRecords++;
      }
    }

    return {
      success: true,
      message: `${employees.length} çalışan için ${totalRecords} puantaj kaydı oluşturuldu`,
      records: totalRecords
    };
  } catch (error) {
    console.error('Aylık puantaj oluşturulurken hata:', error);
    throw error;
  }
}

/**
 * Belirli bir ay için puantaj takvimini getirir
 * Onaylı izinleri, çalışma programını ve işe giriş/çıkış tarihlerini birleştirir
 * @param {String} companyId - Şirket ID'si
 * @param {Number} month - Ay (1-12)
 * @param {Number} year - Yıl
 * @param {String} employeeId - (Opsiyonel) Belirli bir çalışan
 */
async function getAttendanceCalendar(companyId, month, year, employeeId = null) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Şablondan kodları al
    const templateCodes = await getTemplateCodesForCompany(companyId);

    // Çalışanları al (aktif olmayanlar dahil - işten çıkanlar için)
    let employeeQuery = { company: companyId };
    if (employeeId) {
      employeeQuery._id = employeeId;
    } else {
      // Ay içinde aktif olan veya ay içinde işten çıkmış olanları al
      employeeQuery.$or = [
        { isActive: true },
        {
          isActive: false,
          exitDate: { $gte: startDate }
        }
      ];
    }
    const employees = await Employee.find(employeeQuery).populate('workingHours');

    // Mevcut attendance kayıtlarını al
    let attendanceQuery = {
      company: companyId,
      date: { $gte: startDate, $lte: endDate }
    };
    if (employeeId) {
      attendanceQuery.employee = employeeId;
    }
    const attendances = await Attendance.find(attendanceQuery);

    // Onaylı izinleri al
    let leaveQuery = {
      company: companyId,
      status: 'APPROVED',
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    };
    if (employeeId) {
      leaveQuery.employee = employeeId;
    }
    const approvedLeaves = await LeaveRequest.find(leaveQuery)
      .populate({
        path: 'companyLeaveType',
        populate: { path: 'leaveType' }
      });

    // Tatil günlerini al
    const holidays = await CompanyHolidayCalendar.find({
      company: companyId,
      date: { $gte: startDate, $lte: endDate }
    });
    const holidayMap = {};
    holidays.forEach(h => {
      holidayMap[h.date.toISOString().split('T')[0]] = h;
    });

    // Sonuç objesi
    const calendar = {};
    const daysInMonth = new Date(year, month, 0).getDate();

    const dayMap = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };

    for (const employee of employees) {
      const empId = employee._id.toString();
      calendar[empId] = {
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNumber: employee.employeeNumber,
          hireDate: employee.hireDate,
          exitDate: employee.exitDate,
          isActive: employee.isActive
        },
        dates: {}
      };

      // İşe giriş tarihi
      const hireDate = employee.hireDate ? new Date(employee.hireDate) : null;
      if (hireDate) hireDate.setHours(0, 0, 0, 0);

      // İşten çıkış tarihi
      const exitDate = employee.exitDate ? new Date(employee.exitDate) : null;
      if (exitDate) exitDate.setHours(0, 0, 0, 0);

      // Çalışma saatlerini al
      let workingHours = employee.workingHours || {
        monday: { isWorking: true },
        tuesday: { isWorking: true },
        wednesday: { isWorking: true },
        thursday: { isWorking: true },
        friday: { isWorking: true },
        saturday: { isWorking: false },
        sunday: { isWorking: false }
      };

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        currentDate.setHours(0, 0, 0, 0);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();
        const dayName = dayMap[dayOfWeek];

        // 1. İşe başlamadan önce mi? (hireDate'den önce)
        if (hireDate && currentDate < hireDate) {
          calendar[empId].dates[dateStr] = {
            code: templateCodes.NOT_EMPLOYED.code,
            description: templateCodes.NOT_EMPLOYED.description,
            color: templateCodes.NOT_EMPLOYED.color,
            source: 'not_employed'
          };
          continue;
        }

        // 2. İşten çıktıktan sonra mı? (exitDate'den sonra)
        if (exitDate && currentDate > exitDate) {
          calendar[empId].dates[dateStr] = {
            code: templateCodes.NOT_EMPLOYED.code,
            description: templateCodes.NOT_EMPLOYED.description,
            color: templateCodes.NOT_EMPLOYED.color,
            source: 'not_employed'
          };
          continue;
        }

        // 3. Mevcut attendance kaydı var mı?
        const existingAttendance = attendances.find(a =>
          a.employee.toString() === empId &&
          a.date.toISOString().split('T')[0] === dateStr
        );

        if (existingAttendance) {
          calendar[empId].dates[dateStr] = {
            code: existingAttendance.code,
            description: existingAttendance.description,
            source: 'attendance'
          };
          continue;
        }

        // 4. Onaylı izin var mı?
        const leave = approvedLeaves.find(l => {
          if (l.employee.toString() !== empId) return false;
          const leaveStart = new Date(l.startDate);
          const leaveEnd = new Date(l.endDate);
          leaveStart.setHours(0, 0, 0, 0);
          leaveEnd.setHours(0, 0, 0, 0);
          return currentDate >= leaveStart && currentDate <= leaveEnd;
        });

        if (leave) {
          let attendanceCode = templateCodes.OTHER_LEAVE.code;
          let color = templateCodes.OTHER_LEAVE.color;

          // İzin türüne göre şablondan kodu al
          if (leave.companyLeaveType?.leaveType?.code) {
            const leaveTypeCode = leave.companyLeaveType.leaveType.code;
            if (leaveTypeCode === 'ANNUAL_LEAVE' && templateCodes.ANNUAL_LEAVE) {
              attendanceCode = templateCodes.ANNUAL_LEAVE.code;
              color = templateCodes.ANNUAL_LEAVE.color;
            } else if (leaveTypeCode === 'SICK_LEAVE' && templateCodes.SICK_LEAVE) {
              attendanceCode = templateCodes.SICK_LEAVE.code;
              color = templateCodes.SICK_LEAVE.color;
            } else if (leaveTypeCode === 'UNPAID_LEAVE' && templateCodes.UNPAID_LEAVE) {
              attendanceCode = templateCodes.UNPAID_LEAVE.code;
              color = templateCodes.UNPAID_LEAVE.color;
            }
          } else if (leave.companyLeaveType?.leaveType?.attendanceCode) {
            attendanceCode = leave.companyLeaveType.leaveType.attendanceCode;
          }

          calendar[empId].dates[dateStr] = {
            code: attendanceCode,
            description: leave.companyLeaveType?.name || leave.type,
            color: color,
            source: 'leave',
            leaveId: leave._id
          };
          continue;
        }

        // 5. Resmi tatil mi?
        if (holidayMap[dateStr]) {
          calendar[empId].dates[dateStr] = {
            code: templateCodes.PUBLIC_HOLIDAY.code,
            description: holidayMap[dateStr].name || templateCodes.PUBLIC_HOLIDAY.description,
            color: templateCodes.PUBLIC_HOLIDAY.color,
            source: 'holiday'
          };
          continue;
        }

        // 6. Hafta tatili mi?
        if (workingHours[dayName] && !workingHours[dayName].isWorking) {
          calendar[empId].dates[dateStr] = {
            code: templateCodes.WEEKEND.code,
            description: templateCodes.WEEKEND.description,
            color: templateCodes.WEEKEND.color,
            source: 'working_hours'
          };
          continue;
        }

        // 7. Normal çalışma günü
        calendar[empId].dates[dateStr] = {
          code: templateCodes.NORMAL_WORK.code,
          description: templateCodes.NORMAL_WORK.description,
          color: templateCodes.NORMAL_WORK.color,
          source: 'default'
        };
      }
    }

    return calendar;
  } catch (error) {
    console.error('Puantaj takvimi alınırken hata:', error);
    throw error;
  }
}

module.exports = {
  createAttendanceFromLeave,
  removeAttendanceFromLeave,
  generateMonthlyAttendance,
  getAttendanceCalendar,
  getTemplateCodesForCompany
};
