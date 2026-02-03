const mongoose = require('mongoose');

const workingHoursSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  monday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true },
    lunchBreak: {
      start: String, // Öğle arası başlangıç (örn: '12:00')
      end: String    // Öğle arası bitiş (örn: '13:00')
    },
    breaks: {
      morningBreak: {
        enabled: { type: Boolean, default: false },
        start: String, // Öğleden önce ara dinlenme başlangıç
        end: String    // Öğleden önce ara dinlenme bitiş
      },
      afternoonBreak: {
        enabled: { type: Boolean, default: false },
        start: String, // Öğleden sonra ara dinlenme başlangıç
        end: String    // Öğleden sonra ara dinlenme bitiş
      }
    }
  },
  tuesday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true },
    lunchBreak: {
      start: String,
      end: String
    },
    breaks: {
      morningBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      },
      afternoonBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      }
    }
  },
  wednesday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true },
    lunchBreak: {
      start: String,
      end: String
    },
    breaks: {
      morningBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      },
      afternoonBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      }
    }
  },
  thursday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true },
    lunchBreak: {
      start: String,
      end: String
    },
    breaks: {
      morningBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      },
      afternoonBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      }
    }
  },
  friday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: true },
    lunchBreak: {
      start: String,
      end: String
    },
    breaks: {
      morningBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      },
      afternoonBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      }
    }
  },
  saturday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: false },
    lunchBreak: {
      start: String,
      end: String
    },
    breaks: {
      morningBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      },
      afternoonBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      }
    }
  },
  sunday: {
    start: String,
    end: String,
    isWorking: { type: Boolean, default: false },
    lunchBreak: {
      start: String,
      end: String
    },
    breaks: {
      morningBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      },
      afternoonBreak: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkingHours', workingHoursSchema);

