const express = require('express');
const router = express.Router();
const Permission = require('../models/Permission');
const { auth, requireRole } = require('../middleware/auth');
const { errorResponse, notFound, forbidden, serverError } = require('../utils/responseHelper');

// Tüm yetkileri listele (super_admin, bayi_admin, company_admin)
router.get('/', auth, async (req, res) => {
  try {
    // Super admin, bayi admin ve company admin yetkileri görebilir
    if (!['super_admin', 'bayi_admin', 'company_admin'].includes(req.user.role.name)) {
      return forbidden(res);
    }
    
    const permissions = await Permission.find().sort({ category: 1, name: 1 });
    res.json({ success: true, data: permissions });
  } catch (error) {
    return serverError(res, error);
  }
});

// Yeni yetki oluştur (sadece super_admin)
router.post('/', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { name, description, category } = req.body;

    if (!name || !description || !category) {
      return errorResponse(res, { message: 'Tüm alanlar gereklidir' });
    }

    const permission = new Permission({
      name,
      description,
      category
    });

    await permission.save();
    res.status(201).json({ success: true, data: permission });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, { message: 'Bu yetki zaten mevcut' });
    }
    return serverError(res, error);
  }
});

// Yetki güncelle (sadece super_admin)
router.put('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const { description, category } = req.body;

    const permission = await Permission.findByIdAndUpdate(
      req.params.id,
      { description, category },
      { new: true, runValidators: true }
    );

    if (!permission) {
      return notFound(res, 'Yetki bulunamadı');
    }

    res.json({ success: true, data: permission });
  } catch (error) {
    return serverError(res, error);
  }
});

// Yetki sil (sadece super_admin)
router.delete('/:id', auth, requireRole('super_admin'), async (req, res) => {
  try {
    const permission = await Permission.findByIdAndDelete(req.params.id);

    if (!permission) {
      return notFound(res, 'Yetki bulunamadı');
    }

    // İlişkili RolePermission kayıtlarını da sil
    const RolePermission = require('../models/RolePermission');
    await RolePermission.deleteMany({ permission: req.params.id });

    res.json({ success: true, message: 'Yetki silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

