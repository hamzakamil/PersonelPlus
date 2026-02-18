const mongoose = require('mongoose');

const employmentPreRecordSchema = new mongoose.Schema({
  // İşlem tipi: 'hire' (işe giriş) veya 'termination' (işten çıkış)
  processType: {
    type: String,
    enum: ['hire', 'termination'],
    required: true
  },
  
  // İşe giriş için aday bilgileri (termination için employeeId kullanılır)
  candidateFullName: {
    type: String,
    required: function() { return this.processType === 'hire'; }
  },
  tcKimlikNo: {
    type: String,
    required: function() { return this.processType === 'hire'; },
    validate: {
      validator: function(v) {
        return !v || v.length === 11;
      },
      message: 'TC Kimlik No 11 haneli olmalıdır'
    }
  },
  email: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  
  // İşten çıkış için çalışan referansı
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: function() { return this.processType === 'termination'; }
  },
  
  // Şirket ve işyeri bilgileri
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  workplaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workplace',
    required: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkplaceSection',
    default: null
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  
  // İşe giriş bilgileri
  hireDate: {
    type: Date,
    required: function() { return this.processType === 'hire'; }
  },
  sgkMeslekKodu: {
    type: String,
    default: null
  },
  jobName: {
    type: String,
    default: null // Görevi (Meslek) açıklama alanı
  },
  ucret: {
    type: Number,
    required: true // Sadece ücret rakamı, net/brüt bilgisi şirket ayarından
  },
  contractType: {
    type: String,
    enum: ['BELİRSİZ_SÜRELİ', 'BELİRLİ_SÜRELİ', 'KISMİ_SÜRELİ', 'UZAKTAN_ÇALIŞMA'],
    default: 'BELİRSİZ_SÜRELİ'
  },
  contractEndDate: {
    type: Date, // Belirli süreli sözleşme bitiş tarihi
    default: null
  },

  // Emekli mi?
  isRetired: {
    type: Boolean,
    default: false
  },

  // Part-time (Kısmi Süreli) çalışma detayları
  partTimeDetails: {
    weeklyHours: {
      type: Number,
      default: null
    },
    workDays: [{
      type: String
    }],
    dailyHours: {
      type: Number,
      default: null
    },
    paymentType: {
      type: String,
      enum: ['monthly', 'hourly'],
      default: 'monthly'
    }
  },

  // İşten çıkış bilgileri
  terminationDate: {
    type: Date,
    required: function() { return this.processType === 'termination'; }
  },
  terminationReason: {
    type: String,
    enum: ['istifa', 'işten çıkarma', null],
    default: null
  },
  description: {
    type: String,
    default: null // Çıkış ile ilgili detaylı açıklama
  },
  severancePayApply: {
    type: Boolean,
    default: false // Kıdem tazminatı yansıtılsın mı (onaylayan için bilgi)
  },
  noticePayApply: {
    type: Boolean,
    default: false // İhbar tazminatı yansıtılsın mı (onaylayan için bilgi)
  },
  
  // Dosyalar
  documents: [{
    type: {
      type: String,
      enum: ['sözleşme', 'istifa_dilekçesi', 'ihbar_kıdem_hesap', 'işe_giriş_bildirgesi', 'işten_çıkış_bildirgesi', 'iş_sözleşmesi_word', 'iş_başvuru_formu'],
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Onay süreci (5 durum: düzeltme talebi ve iptal talebi eklendi)
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'CANCELLED', 'REVISION_REQUESTED', 'CANCELLATION_REQUESTED'],
    default: 'PENDING'
  },
      pendingDate: {
        type: Date,
        default: Date.now
      },
      waitingApprovalAt: {
        type: Date,
        default: Date.now // Onaya gönderilme tarihi
      },
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Reddetme bilgileri
  rejectionReason: {
    type: String,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Düzeltme talebi bilgileri (bayi tarafından istenir)
  revisionRequest: {
    reason: {
      type: String,
      default: null
    },
    requestedAt: {
      type: Date,
      default: null
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },

  // İptal talebi bilgileri (şirket tarafından istenir, bayi onaylar)
  cancellationRequest: {
    reason: {
      type: String,
      default: null
    },
    requestedAt: {
      type: Date,
      default: null
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectedAt: {
      type: Date,
      default: null
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    }
  },

  // İşe giriş onaylandıktan sonra çalışan oluşturuldu mu?
  employeeCreated: {
    type: Boolean,
    default: false
  },
  // Oluşturulan çalışan referansı (hire işlemi için)
  createdEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },

  // Onay geri alma geçmişi
  revertHistory: [{
    revertedAt: {
      type: Date,
      default: Date.now
    },
    revertedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    previousStatus: {
      type: String
    },
    previousApprovedAt: {
      type: Date
    },
    previousApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: {
      type: String
    }
  }],

  // Oluşturan
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
employmentPreRecordSchema.index({ companyId: 1, status: 1 });
employmentPreRecordSchema.index({ processType: 1, status: 1 });
employmentPreRecordSchema.index({ tcKimlikNo: 1, companyId: 1 });
employmentPreRecordSchema.index({ status: 1, employeeCreated: 1 }); // Onaylanmış ama çalışan oluşturulmamış talepler için

module.exports = mongoose.model('EmploymentPreRecord', employmentPreRecordSchema);

