const mongoose = require('mongoose');

const sgkMeslekKoduSchema = new mongoose.Schema({
  kod: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ad: {
    type: String,
    required: true,
    index: true
  },
  // Arama için normalize edilmiş ad (türkçe karaktersiz, küçük harf)
  adNormalized: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// Text index for full-text search
sgkMeslekKoduSchema.index({ ad: 'text', kod: 'text' });

// Pre-save hook to normalize the name for better search
sgkMeslekKoduSchema.pre('save', function(next) {
  if (this.ad) {
    this.adNormalized = this.ad
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/İ/g, 'i')
      .replace(/Ğ/g, 'g')
      .replace(/Ü/g, 'u')
      .replace(/Ş/g, 's')
      .replace(/Ö/g, 'o')
      .replace(/Ç/g, 'c');
  }
  next();
});

module.exports = mongoose.model('SgkMeslekKodu', sgkMeslekKoduSchema);
