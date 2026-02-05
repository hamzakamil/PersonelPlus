const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  workplace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workplace',
    required: true // SGK İşyeri - zorunlu
  },
  workplaceSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkplaceSection',
    default: null // İşyeri Bölümü - opsiyonel
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null // Departman - opsiyonel (artık zorunlu değil)
  },
  employeeNumber: {
    type: String
    // Otomatik sıra numarası (read-only, backend tarafından atanır)
  },
  personelNumarasi: {
    type: String
    // Manuel personel numarası (opsiyonel, kullanıcı girebilir, alfanumerik)
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  exitDate: {
    type: Date // İşten çıkış tarihi
  },
  exitReason: {
    type: String // İşten ayrılış nedeni (gösterim metni)
  },
  exitReasonCode: {
    type: String // İşten ayrılış nedeni kodu
  },
  status: {
    type: String,
    enum: ['active', 'separated'],
    default: 'active'
  },
  separationDate: {
    type: Date // Ayrılış tarihi (onaylandıktan sonra)
  },
  separationReason: {
    type: String // Ayrılış nedeni (onaylandıktan sonra)
  },

  // İş Geçmişi - Aynı şirkette birden fazla çalışma dönemi
  employmentHistory: [{
    hireDate: {
      type: Date,
      required: true
    },
    terminationDate: {
      type: Date,
      default: null
    },
    terminationReason: {
      type: String,
      default: null
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    workplace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workplace',
      default: null
    },
    position: {
      type: String,
      default: null
    },
    salary: {
      type: Number,
      default: null
    },
    isNetSalary: {
      type: Boolean,
      default: true
    },
    employmentRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmploymentPreRecord',
      default: null
    },
    notes: {
      type: String,
      default: null
    }
  }],

  // Özet bilgiler
  lastHireDate: {
    type: Date // Son işe giriş tarihi (aktif dönem)
  },
  lastTerminationDate: {
    type: Date // Son işten çıkış tarihi
  },
  totalWorkMonths: {
    type: Number,
    default: 0 // Toplam çalışma süresi (ay cinsinden)
  },
  rehireCount: {
    type: Number,
    default: 0 // Tekrar işe alım sayısı
  },

  birthDate: {
    type: Date
  },
  salary: {
    type: Number // Ücret
  },
  isNetSalary: {
    type: Boolean, // Net ücret mi? (true: net, false: brüt)
    default: true // Varsayılan olarak net ücret
  },
  // Genel Bilgiler
  tcKimlik: {
    type: String,
    required: true
  },
  position: {
    type: String // Görevi
  },
  // Kimlik Bilgileri
  birthPlace: {
    type: String // Doğum yeri
  },
  passportNumber: {
    type: String // Pasaport No
  },
  bloodType: {
    type: String // Kan grubu
  },
  militaryStatus: {
    type: String // Askerlik durumu
  },
  hasCriminalRecord: {
    type: Boolean, // Sabıkalı mı?
    default: false
  },
  hasDrivingLicense: {
    type: Boolean, // Ehliyet var mı?
    default: false
  },
  isRetired: {
    type: Boolean, // Emekli mi?
    default: false
  },
  // Özel Alanlar (dinamik)
  customFields: [{
    name: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }],
  weekendDays: {
    type: [Number], // [0, 6] for Sunday and Saturday, default from company/department
    default: null
  },
  workingHours: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkingHours',
    default: null // Çalışma saatleri şablonu
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isActivated: {
    type: Boolean,
    default: false // Email aktivasyonu yapıldı mı?
  },
  activatedAt: {
    type: Date // Aktivasyon tarihi
  },
  activationToken: {
    type: String // Aktivasyon token'ı
  },
  // Çok Kademeli İzin Onay Sistemi
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // Direkt yönetici (nullable)
  },
  approvalChain: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }], // Onay zinciri - manager'dan başlayarak yukarı doğru otomatik hesaplanacak
  createdByBayiId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dealer',
    default: null // Bayi admin tarafından oluşturulduysa bayi ID'si
  }
}, {
  timestamps: true
});

// Manager değiştiğinde approvalChain'i otomatik güncelle
employeeSchema.methods.updateApprovalChain = async function() {
  const chain = [];
  let currentManager = this.manager;

  // Manager'dan başlayarak yukarı doğru zincir oluştur
  while (currentManager) {
    const managerDoc = await mongoose.model('Employee').findById(currentManager).select('_id manager');
    if (managerDoc) {
      chain.push(managerDoc._id);
      currentManager = managerDoc.manager;
    } else {
      break;
    }
  }

  this.approvalChain = chain;
  return this.save();
};

// Toplam çalışma süresini hesapla (ay cinsinden)
employeeSchema.methods.calculateTotalWorkMonths = function() {
  let totalMonths = 0;

  // Geçmiş dönemleri hesapla
  this.employmentHistory.forEach(period => {
    if (period.hireDate && period.terminationDate) {
      const months = Math.floor(
        (new Date(period.terminationDate) - new Date(period.hireDate)) / (1000 * 60 * 60 * 24 * 30)
      );
      totalMonths += months;
    }
  });

  // Aktif dönem varsa ekle
  if (this.isActive && this.lastHireDate) {
    const months = Math.floor(
      (new Date() - new Date(this.lastHireDate)) / (1000 * 60 * 60 * 24 * 30)
    );
    totalMonths += months;
  }

  return totalMonths;
};

// Yeni iş dönemi ekle
employeeSchema.methods.addEmploymentPeriod = function(periodData) {
  this.employmentHistory.push({
    hireDate: periodData.hireDate,
    terminationDate: periodData.terminationDate || null,
    terminationReason: periodData.terminationReason || null,
    department: periodData.department || null,
    workplace: periodData.workplace || null,
    position: periodData.position || null,
    salary: periodData.salary || null,
    isNetSalary: periodData.isNetSalary !== undefined ? periodData.isNetSalary : true,
    employmentRecordId: periodData.employmentRecordId || null,
    notes: periodData.notes || null
  });

  // Özet bilgileri güncelle
  this.totalWorkMonths = this.calculateTotalWorkMonths();
};

// Çalışanı yeniden aktifleştir (rehire)
employeeSchema.methods.reactivateEmployee = function(rehireData) {
  // Mevcut dönemi geçmişe ekle (eğer varsa)
  if (this.lastHireDate) {
    this.addEmploymentPeriod({
      hireDate: this.lastHireDate,
      terminationDate: this.lastTerminationDate || this.exitDate,
      terminationReason: this.separationReason || this.exitReason,
      department: this.department,
      workplace: this.workplace,
      position: this.position,
      salary: this.salary,
      isNetSalary: this.isNetSalary,
      employmentRecordId: rehireData.previousEmploymentRecordId || null
    });
  }

  // Yeni dönem bilgilerini aktif kayda yaz
  this.isActive = true;
  this.status = 'active';
  this.lastHireDate = rehireData.hireDate;
  this.lastTerminationDate = null;
  this.hireDate = rehireData.hireDate;
  this.exitDate = null;
  this.exitReason = null;
  this.separationDate = null;
  this.separationReason = null;

  // Yeni dönem bilgileri
  if (rehireData.department) this.department = rehireData.department;
  if (rehireData.workplace) this.workplace = rehireData.workplace;
  if (rehireData.position) this.position = rehireData.position;
  if (rehireData.salary) this.salary = rehireData.salary;
  if (rehireData.isNetSalary !== undefined) this.isNetSalary = rehireData.isNetSalary;

  // Rehire sayısını artır
  this.rehireCount = (this.rehireCount || 0) + 1;

  // Toplam çalışma süresini güncelle
  this.totalWorkMonths = this.calculateTotalWorkMonths();
};

// Pre-save hook: Manager değiştiğinde approvalChain'i güncelle
employeeSchema.pre('save', async function(next) {
  try {
    // Manager değiştiyse veya yeni kayıt ise
    if (this.isModified('manager') || this.isNew) {
      const chain = [];
      let currentManager = this.manager;
      
      // Manager'dan başlayarak yukarı doğru zincir oluştur
      while (currentManager) {
        const managerDoc = await mongoose.model('Employee').findById(currentManager).select('_id manager');
        if (managerDoc) {
          chain.push(managerDoc._id);
          currentManager = managerDoc.manager;
        } else {
          break;
        }
      }
      
      this.approvalChain = chain;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Indexes
// TC Kimlik No şirket bazında unique olmalı (aynı kişi farklı şirketlerde çalışabilir)
employeeSchema.index({ tcKimlik: 1, company: 1 }, { unique: true });
// Personel numarası şirket bazında unique olmalı (her şirket 1'den başlar)
employeeSchema.index({ company: 1, employeeNumber: 1 }, { unique: true, sparse: true });
// İş geçmişi sorguları için
employeeSchema.index({ company: 1, isActive: 1 });
employeeSchema.index({ company: 1, rehireCount: 1 });

module.exports = mongoose.model('Employee', employeeSchema);

