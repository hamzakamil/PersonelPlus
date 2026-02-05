const express = require('express');
const router = express.Router();
const CheckIn = require('../models/CheckIn');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');
const attendanceCalculationService = require('../services/attendanceCalculationService');

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Check location
router.post('/check-location', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return errorResponse(res, { message: 'Lokasyon bilgisi gereklidir' });
    }

    // Get employee
    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const company = await Company.findById(employee.company);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    if (!company.checkInSettings || !company.checkInSettings.enabled) {
      return errorResponse(res, { message: 'Giriş/çıkış sistemi aktif değil' });
    }

    if (!company.checkInSettings.allowedLocation || 
        !company.checkInSettings.allowedLocation.latitude ||
        !company.checkInSettings.allowedLocation.longitude) {
      return errorResponse(res, { message: 'Şirket lokasyonu ayarlanmamış' });
    }

    const allowedLat = company.checkInSettings.allowedLocation.latitude;
    const allowedLon = company.checkInSettings.allowedLocation.longitude;
    const radius = company.checkInSettings.allowedLocation.radius || 100;

    const distance = calculateDistance(
      latitude,
      longitude,
      allowedLat,
      allowedLon
    );

    const isWithinRadius = distance <= radius;

    res.json({
      isWithinRadius,
      distance: Math.round(distance),
      radius,
      message: isWithinRadius 
        ? 'Lokasyon onaylandı' 
        : `Şirket lokasyonundan ${Math.round(distance)}m uzaktasınız. Maksimum mesafe: ${radius}m`
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Check in
router.post('/check-in', auth, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const company = await Company.findById(employee.company);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    if (!company.checkInSettings || !company.checkInSettings.enabled) {
      return errorResponse(res, { message: 'Giriş/çıkış sistemi aktif değil' });
    }

    // Check location if required
    if (company.checkInSettings.locationRequired) {
      if (!latitude || !longitude) {
        return errorResponse(res, { message: 'Lokasyon bilgisi gereklidir' });
      }

      if (company.checkInSettings.allowedLocation && 
          company.checkInSettings.allowedLocation.latitude &&
          company.checkInSettings.allowedLocation.longitude) {
        const allowedLat = company.checkInSettings.allowedLocation.latitude;
        const allowedLon = company.checkInSettings.allowedLocation.longitude;
        const radius = company.checkInSettings.allowedLocation.radius || 100;

        const distance = calculateDistance(
          latitude,
          longitude,
          allowedLat,
          allowedLon
        );

        if (distance > radius) {
          return errorResponse(res, {
            message: `Şirket lokasyonundan ${Math.round(distance)}m uzaktasınız. Maksimum mesafe: ${radius}m`,
            isWithinRadius: false,
            distance: Math.round(distance)
          });
        }
      }
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingCheckIn = await CheckIn.findOne({
      employee: employee._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingCheckIn && existingCheckIn.checkInTime) {
      return errorResponse(res, { message: 'Bugün zaten giriş yaptınız' });
    }

    const checkInTime = new Date();

    if (existingCheckIn) {
      // Update existing record
      existingCheckIn.checkInTime = checkInTime;
      existingCheckIn.checkInLocation = latitude && longitude ? {
        latitude,
        longitude,
        address
      } : null;
      existingCheckIn.status = 'checked_in';
      await existingCheckIn.save();
    } else {
      // Create new record
      const checkIn = new CheckIn({
        employee: employee._id,
        company: company._id,
        date: today,
        checkInTime,
        checkInLocation: latitude && longitude ? {
          latitude,
          longitude,
          address
        } : null,
        status: 'checked_in',
        isAuto: false
      });
      await checkIn.save();
    }

    const checkInRecord = await CheckIn.findOne({
      employee: employee._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate('employee', 'firstName lastName');

    res.json({
      message: 'Giriş başarılı',
      checkIn: checkInRecord
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Check out
router.post('/check-out', auth, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const company = await Company.findById(employee.company);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    if (!company.checkInSettings || !company.checkInSettings.enabled) {
      return errorResponse(res, { message: 'Giriş/çıkış sistemi aktif değil' });
    }

    // Check location if required
    if (company.checkInSettings.locationRequired) {
      if (!latitude || !longitude) {
        return errorResponse(res, { message: 'Lokasyon bilgisi gereklidir' });
      }

      if (company.checkInSettings.allowedLocation && 
          company.checkInSettings.allowedLocation.latitude &&
          company.checkInSettings.allowedLocation.longitude) {
        const allowedLat = company.checkInSettings.allowedLocation.latitude;
        const allowedLon = company.checkInSettings.allowedLocation.longitude;
        const radius = company.checkInSettings.allowedLocation.radius || 100;

        const distance = calculateDistance(
          latitude,
          longitude,
          allowedLat,
          allowedLon
        );

        if (distance > radius) {
          return errorResponse(res, {
            message: `Şirket lokasyonundan ${Math.round(distance)}m uzaktasınız. Maksimum mesafe: ${radius}m`,
            isWithinRadius: false,
            distance: Math.round(distance)
          });
        }
      }
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCheckIn = await CheckIn.findOne({
      employee: employee._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (!existingCheckIn || !existingCheckIn.checkInTime) {
      return errorResponse(res, { message: 'Önce giriş yapmalısınız' });
    }

    if (existingCheckIn.checkOutTime) {
      return errorResponse(res, { message: 'Bugün zaten çıkış yaptınız' });
    }

    const checkOutTime = new Date();
    existingCheckIn.checkOutTime = checkOutTime;
    existingCheckIn.checkOutLocation = latitude && longitude ? {
      latitude,
      longitude,
      address
    } : null;
    existingCheckIn.status = 'checked_out';
    await existingCheckIn.save();

    // Günlük devam hesaplamasını tetikle
    let attendanceSummary = null;
    try {
      attendanceSummary = await attendanceCalculationService.processCheckInOut(existingCheckIn);
    } catch (calcError) {
      console.error('Devam hesaplama hatası:', calcError);
      // Hesaplama hatası check-out işlemini engellemez
    }

    const checkInRecord = await CheckIn.findById(existingCheckIn._id)
      .populate('employee', 'firstName lastName');

    res.json({
      message: 'Çıkış başarılı',
      checkIn: checkInRecord,
      attendanceSummary
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get today's check-in status
router.get('/today', auth, async (req, res) => {
  try {
    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) {
      return notFound(res, 'Çalışan bulunamadı');
    }

    const company = await Company.findById(employee.company);
    if (!company) {
      return notFound(res, 'Şirket bulunamadı');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkIn = await CheckIn.findOne({
      employee: employee._id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      checkIn: checkIn || null,
      settings: company.checkInSettings || null
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Get check-in records (for employees and admins)
router.get('/', auth, async (req, res) => {
  try {
    const { employee: employeeId, startDate, endDate } = req.query;
    let query = {};

    if (req.user.role.name === 'employee') {
      const employee = await Employee.findOne({ email: req.user.email });
      if (employee) {
        query.employee = employee._id;
      }
    } else if (employeeId) {
      query.employee = employeeId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Check access for admins
    if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      const employee = employeeId ? await Employee.findById(employeeId) : null;
      if (employee && req.user.company.toString() !== employee.company.toString()) {
        return forbidden(res);
      }
      if (!employeeId) {
        // Get all employees from the company
        const employees = await Employee.find({ company: req.user.company });
        query.employee = { $in: employees.map(e => e._id) };
      }
    }

    const checkIns = await CheckIn.find(query)
      .populate('employee', 'firstName lastName employeeNumber')
      .populate('company', 'name')
      .sort({ date: -1, checkInTime: -1 })
      .limit(100);

    res.json(checkIns);
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;






