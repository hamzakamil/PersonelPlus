const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  dealer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String
  },
  address: {
    type: String
  },
  taxOffice: {
    type: String // Vergi dairesi
  },
  taxNumber: {
    type: String // Vergi numarası veya TC Kimlik No
  },
  mersisNo: {
    type: String // Mersis numarası (16 hane)
  },
  foundingDate: {
    type: Date // Şirket kuruluş tarihi
  },
  authorizedPerson: {
    fullName: {
      type: String // Yetkili adı soyadı
    },
    phone: {
      type: String // Yetkili telefon
    },
    email: {
      type: String // Yetkili email (admin email)
    }
  },
  logo: {
    type: String
  },
  title: {
    type: String,
    default: 'Personel Yönetim Sistemi'
  },
  activeAttendanceTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceTemplate',
    default: null
  },
  leaveSettings: {
    minimumPartialLeave: {
      type: Number,
      default: 10 // Minimum days for partial leave
    },
    includeSaturdayInLeave: {
      type: String,
      enum: ['never', 'always', 'if_monday_start', 'if_friday_start', 'if_in_range'],
      default: 'never'
    },
    saturdayWorkingDay: {
      type: Boolean,
      default: false // If Saturday is a working day
    },
    sundayWorkingDay: {
      type: Boolean,
      default: false // If Sunday is a working day
    },
    weekendDays: {
      type: [Number], // [0] for Sunday (default), can be [0,6] for both, etc.
      default: [0] // Sunday by default
    },
    // Yıllık izin hesaplamasında hangi hafta tatili günleri düşülecek
    weekendLeaveDeduction: {
      type: String,
      enum: ['none', 'all', 'first_only', 'second_only'], // none: hiçbiri, all: tüm günler, first_only/second_only: sadece ilk/ikinci gün
      default: 'none'
    },
    // Hangi gün birinci hafta tatili günü (weekendDays içinden)
    primaryWeekendDay: {
      type: Number, // 0=Pazar, 6=Cumartesi
      default: 0
    }
  },
  // Aktif puantaj şablonu
  activePuantajTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PuantajTemplate',
    default: null
  },
  checkInSettings: {
    enabled: {
      type: Boolean,
      default: false // Enable check-in/check-out buttons
    },
    locationRequired: {
      type: Boolean,
      default: true // Require location for check-in
    },
    allowedLocation: {
      latitude: {
        type: Number // Company location latitude
      },
      longitude: {
        type: Number // Company location longitude
      },
      radius: {
        type: Number, // Radius in meters
        default: 100 // Default 100 meters
      }
    },
    autoCheckIn: {
      type: Boolean,
      default: false // Auto check-in/check-out based on working hours
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Bayinin kendi şirketi mi? (bayi çalışanları için)
  isDealerSelfCompany: {
    type: Boolean,
    default: false
  },
  isActivated: {
    type: Boolean,
    default: false // Şirket aktif mi? (company_admin ilk girişte aktif olur)
  },
  activatedAt: {
    type: Date // Aktif edilme tarihi
  },
  naceCode: {
    type: String,
    default: null // NACE kodu (İnşaat/Balıkçılık kontrolü için)
  },
  payrollCalculationType: {
    type: String,
    enum: ['NET', 'BRUT'],
    default: 'NET' // Ücret hesaplama türü (Net/Brüt)
  },
  onboarding_requires_dealer_approval: {
    type: Boolean,
    default: false // İşe giriş için bayi onayı gerekli mi?
  },
  // Onaylanan işe giriş talepleri otomatik olarak çalışanlar listesine eklensin mi?
  autoAddApprovedEmployees: {
    type: Boolean,
    default: true // Varsayılan: otomatik ekle
  },
  leavePolicy: {
    allowSplitLeave: {
      type: Boolean,
      default: true
    },
    minFirstBlockDays: {
      type: Number,
      default: 10
    }
  },

  // İzin Onay Akışı Ayarları
  leaveApprovalSettings: {
    enabled: {
      type: Boolean,
      default: true // Onay sistemi aktif mi?
    },
    requireApproval: {
      type: Boolean,
      default: true // Onay chain boş olsa bile onay beklensin mi?
    },
    autoApproveIfNoApprover: {
      type: Boolean,
      default: false // Onaylayıcı yoksa otomatik onayla
    },
    approvalLevels: {
      type: Number,
      default: 0, // 0 = Tüm chain, 1+ = Belirli sayıda onay
      min: 0
    },
    allowSelfApproval: {
      type: Boolean,
      default: false // Yönetici kendi izin talebini onaylayabilir mi?
    }
  },

  // Avans Onay Akışı Ayarları
  advanceApprovalSettings: {
    enabled: {
      type: Boolean,
      default: true // Onay sistemi aktif mi?
    },
    useLeaveApprovalChain: {
      type: Boolean,
      default: true // İzin onay akışıyla aynı mı kullanılsın?
    },
    requireApproval: {
      type: Boolean,
      default: true // Onay chain boş olsa bile onay beklensin mi?
    },
    autoApproveIfNoApprover: {
      type: Boolean,
      default: false // Onaylayıcı yoksa otomatik onayla
    },
    approvalLevels: {
      type: Number,
      default: 0, // 0 = Tüm chain, 1+ = Belirli sayıda onay
      min: 0
    },
    allowSelfApproval: {
      type: Boolean,
      default: false // Yönetici kendi avans talebini onaylayabilir mi?
    }
  },

  // Şirket kota bilgileri
  quota: {
    allocated: {
      type: Number,
      default: 0 // Bayiden atanan kota
    },
    used: {
      type: Number,
      default: 0 // Kullanılan kota (aktif çalışan)
    },
    isUnlimited: {
      type: Boolean,
      default: false // Sınırsız mı?
    }
  },

  // Avans ayarları
  advanceSettings: {
    enabled: {
      type: Boolean,
      default: false // Avans talebi sistemi aktif mi?
    },
    maxAmountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED', 'UNLIMITED'],
      default: 'PERCENTAGE' // PERCENTAGE: Maaşın yüzdesi, FIXED: Sabit tutar, UNLIMITED: Sınırsız
    },
    maxAmountValue: {
      type: Number,
      default: 50 // PERCENTAGE ise %50, FIXED ise 5000 TL gibi
    },
    maxInstallments: {
      type: Number,
      default: 3,
      min: 1,
      max: 12 // Maksimum 12 taksit
    },
    minWorkMonths: {
      type: Number,
      default: 3 // Minimum 3 ay çalıştıktan sonra avans alabilir
    },
    requestStartDay: {
      type: Number,
      default: 1, // Ayın 1. gününden itibaren talep edilebilir (0 = sınırsız)
      min: 0,
      max: 31
    },
    monthlyRequestLimit: {
      type: Number,
      default: 1, // Ayda maksimum 1 talep (0 = sınırsız)
      min: 0
    },
    approvalRequired: {
      type: Boolean,
      default: true // Onay gerektiriyor mu?
    },
    allowInstallments: {
      type: Boolean,
      default: true // Taksitli avans izni var mı?
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);

