const mongoose = require('mongoose');
require('dotenv').config();
const AttendanceTemplate = require('../models/AttendanceTemplate');
const AttendanceTemplateItem = require('../models/AttendanceTemplateItem');

/**
 * Varsayılan puantaj şablonu oluşturur
 * Bu şablon tüm şirketler tarafından kullanılabilir
 */
async function initDefaultAttendanceTemplate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pys');
    console.log('MongoDB bağlandı');

    // Varsayılan şablon var mı kontrol et
    const existing = await AttendanceTemplate.findOne({ isDefault: true, name: 'Varsayılan Puantaj Şablonu' });
    if (existing) {
      console.log('ℹ️  Varsayılan puantaj şablonu zaten mevcut');

      // Mevcut şablonun item'larını kontrol et ve güncelle
      await updateTemplateItems(existing._id);

      process.exit(0);
      return;
    }

    // Yeni şablon oluştur
    const template = new AttendanceTemplate({
      name: 'Varsayılan Puantaj Şablonu',
      description: 'Sistem varsayılan puantaj şablonu - tüm temel kodları içerir',
      isDefault: true,
      createdBy: 'super_admin',
      company: null,
      isActive: true
    });
    await template.save();
    console.log('✅ Varsayılan puantaj şablonu oluşturuldu');

    // Şablon öğelerini oluştur
    await createTemplateItems(template._id);

    console.log('\n✅ Varsayılan puantaj şablonu ve öğeleri oluşturuldu');
    process.exit(0);
  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

async function createTemplateItems(templateId) {
  const items = getDefaultItems(templateId);
  await AttendanceTemplateItem.insertMany(items);
  console.log(`✅ ${items.length} puantaj kodu oluşturuldu`);
}

async function updateTemplateItems(templateId) {
  const defaultItems = getDefaultItems(templateId);

  for (const item of defaultItems) {
    const existing = await AttendanceTemplateItem.findOne({
      template: templateId,
      code: item.code
    });

    if (existing) {
      // systemType ve isSystemCode alanlarını güncelle
      existing.systemType = item.systemType;
      existing.isSystemCode = item.isSystemCode;
      await existing.save();
      console.log(`✅ ${item.code} güncellendi`);
    } else {
      // Yeni öğe oluştur
      await AttendanceTemplateItem.create(item);
      console.log(`✅ ${item.code} oluşturuldu`);
    }
  }
}

function getDefaultItems(templateId) {
  return [
    // Sistem kodları
    {
      template: templateId,
      code: '-',
      description: 'İşe başlamadan önce / İşten çıktıktan sonra',
      color: '#9CA3AF', // Gray
      isWorkingDay: false,
      order: 0,
      systemType: 'NOT_EMPLOYED',
      isSystemCode: true
    },
    {
      template: templateId,
      code: 'N',
      description: 'Normal Çalışma',
      color: '#10B981', // Green
      isWorkingDay: true,
      order: 1,
      systemType: 'NORMAL_WORK',
      isSystemCode: true
    },
    {
      template: templateId,
      code: 'H',
      description: 'Hafta Tatili',
      color: '#3B82F6', // Blue
      isWorkingDay: false,
      order: 2,
      systemType: 'WEEKEND',
      isSystemCode: true
    },
    {
      template: templateId,
      code: 'T',
      description: 'Resmi Tatil',
      color: '#EF4444', // Red
      isWorkingDay: false,
      order: 3,
      systemType: 'PUBLIC_HOLIDAY',
      isSystemCode: true
    },
    // İzin kodları
    {
      template: templateId,
      code: 'S',
      description: 'Yıllık İzin (Senelik)',
      color: '#8B5CF6', // Purple
      isWorkingDay: false,
      order: 4,
      systemType: 'ANNUAL_LEAVE',
      isSystemCode: true
    },
    {
      template: templateId,
      code: 'R',
      description: 'Rapor / Hastalık İzni',
      color: '#F59E0B', // Amber
      isWorkingDay: false,
      order: 5,
      systemType: 'SICK_LEAVE',
      isSystemCode: true
    },
    {
      template: templateId,
      code: 'U',
      description: 'Ücretsiz İzin',
      color: '#EC4899', // Pink
      isWorkingDay: false,
      order: 6,
      systemType: 'UNPAID_LEAVE',
      isSystemCode: true
    },
    {
      template: templateId,
      code: 'D',
      description: 'Diğer İzinler',
      color: '#6366F1', // Indigo
      isWorkingDay: false,
      order: 7,
      systemType: 'OTHER_LEAVE',
      isSystemCode: true
    },
    // Ek kullanıcı kodları (örnekler)
    {
      template: templateId,
      code: 'G',
      description: 'Geç Geldi',
      color: '#F97316', // Orange
      isWorkingDay: true,
      order: 8,
      systemType: null,
      isSystemCode: false
    },
    {
      template: templateId,
      code: 'E',
      description: 'Erken Çıktı',
      color: '#FBBF24', // Yellow
      isWorkingDay: true,
      order: 9,
      systemType: null,
      isSystemCode: false
    },
    {
      template: templateId,
      code: 'M',
      description: 'Mazeret İzni',
      color: '#14B8A6', // Teal
      isWorkingDay: false,
      order: 10,
      systemType: null,
      isSystemCode: false
    },
    {
      template: templateId,
      code: 'Y',
      description: 'Yol İzni',
      color: '#64748B', // Slate
      isWorkingDay: false,
      order: 11,
      systemType: null,
      isSystemCode: false
    },
    {
      template: templateId,
      code: 'FM',
      description: 'Fazla Mesai',
      color: '#22C55E', // Green-500
      isWorkingDay: true,
      order: 12,
      systemType: null,
      isSystemCode: false
    }
  ];
}

initDefaultAttendanceTemplate();
