const express = require('express');
const router = express.Router();
const AttendanceTemplate = require('../models/AttendanceTemplate');
const AttendanceTemplateItem = require('../models/AttendanceTemplateItem');
const { auth, requireRole } = require('../middleware/auth');
const { notFound, forbidden, serverError } = require('../utils/responseHelper');

// Get all attendance templates
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role.name === 'super_admin') {
      // Super admin sees all default templates
      query = { isDefault: true };
    } else if (['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name)) {
      // Company users see default + their company's templates
      query = {
        $or: [
          { isDefault: true },
          { company: req.user.company }
        ]
      };
    } else {
      // bayi_admin sees all
      query = {};
    }

    const templates = await AttendanceTemplate.find(query)
      .sort({ isDefault: -1, createdAt: -1 });
    
    res.json(templates);
  } catch (error) {
    return serverError(res, error);
  }
});

// Get single attendance template with items
router.get('/:id', auth, async (req, res) => {
  try {
    const template = await AttendanceTemplate.findById(req.params.id);
    if (!template) {
      return notFound(res, 'Şablon bulunamadı');
    }

    // Check access
    if (!template.isDefault && template.company && 
        ['company_admin', 'resmi_muhasebe_ik'].includes(req.user.role.name) &&
        req.user.company.toString() !== template.company.toString()) {
      return forbidden(res);
    }

    const items = await AttendanceTemplateItem.find({ template: template._id })
      .sort({ order: 1, code: 1 });

    res.json({
      ...template.toObject(),
      items
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Create attendance template
router.post('/', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const { name, description, items } = req.body;

    let templateData = {
      name,
      description,
      isDefault: false,
      createdBy: 'company',
      company: null
    };

    if (req.user.role.name === 'super_admin') {
      templateData.isDefault = true;
      templateData.createdBy = 'super_admin';
    } else {
      templateData.company = req.user.company;
    }

    const template = new AttendanceTemplate(templateData);
    await template.save();

    // Create template items if provided
    if (items && Array.isArray(items)) {
      const templateItems = items.map((item, index) => ({
        template: template._id,
        code: item.code,
        description: item.description,
        color: item.color || '#6B7280',
        isWorkingDay: item.isWorkingDay !== false,
        order: item.order !== undefined ? item.order : index
      }));

      await AttendanceTemplateItem.insertMany(templateItems);
    }

    const populated = await AttendanceTemplate.findById(template._id);
    const templateItems = await AttendanceTemplateItem.find({ template: template._id })
      .sort({ order: 1, code: 1 });

    res.status(201).json({
      ...populated.toObject(),
      items: templateItems
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Update attendance template
router.put('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const template = await AttendanceTemplate.findById(req.params.id);
    if (!template) {
      return notFound(res, 'Şablon bulunamadı');
    }

    // Super admin can update default templates
    if (template.isDefault && req.user.role.name !== 'super_admin') {
      return forbidden(res, 'Varsayılan şablonları sadece super admin düzenleyebilir');
    }

    // Company users can only update their own templates
    if (!template.isDefault && template.company && 
        req.user.role.name !== 'super_admin' &&
        req.user.company.toString() !== template.company.toString()) {
      return forbidden(res);
    }

    const { name, description, items } = req.body;

    if (name) template.name = name;
    if (description !== undefined) template.description = description;

    await template.save();

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await AttendanceTemplateItem.deleteMany({ template: template._id });

      // Create new items
      const templateItems = items.map((item, index) => ({
        template: template._id,
        code: item.code,
        description: item.description,
        color: item.color || '#6B7280',
        isWorkingDay: item.isWorkingDay !== false,
        order: item.order !== undefined ? item.order : index
      }));

      await AttendanceTemplateItem.insertMany(templateItems);
    }

    const templateItems = await AttendanceTemplateItem.find({ template: template._id })
      .sort({ order: 1, code: 1 });

    res.json({
      ...template.toObject(),
      items: templateItems
    });
  } catch (error) {
    return serverError(res, error);
  }
});

// Delete attendance template
router.delete('/:id', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const template = await AttendanceTemplate.findById(req.params.id);
    if (!template) {
      return notFound(res, 'Şablon bulunamadı');
    }

    // Super admin can delete default templates
    if (template.isDefault && req.user.role.name !== 'super_admin') {
      return forbidden(res, 'Varsayılan şablonları sadece super admin silebilir');
    }

    // Company users can only delete their own templates
    if (!template.isDefault && template.company && 
        req.user.role.name !== 'super_admin' &&
        req.user.company.toString() !== template.company.toString()) {
      return forbidden(res);
    }

    // Delete template items
    await AttendanceTemplateItem.deleteMany({ template: template._id });
    
    // Delete template
    await AttendanceTemplate.findByIdAndDelete(req.params.id);

    res.json({ message: 'Şablon silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

// Add item to template
router.post('/:id/items', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const template = await AttendanceTemplate.findById(req.params.id);
    if (!template) {
      return notFound(res, 'Şablon bulunamadı');
    }

    // Check access
    if (template.isDefault && req.user.role.name !== 'super_admin') {
      return forbidden(res);
    }
    if (!template.isDefault && template.company && 
        req.user.role.name !== 'super_admin' &&
        req.user.company.toString() !== template.company.toString()) {
      return forbidden(res);
    }

    const { code, description, color, isWorkingDay, order } = req.body;

    const item = new AttendanceTemplateItem({
      template: template._id,
      code: code.toUpperCase(),
      description,
      color: color || '#6B7280',
      isWorkingDay: isWorkingDay !== false,
      order: order || 0
    });

    await item.save();
    res.status(201).json(item);
  } catch (error) {
    return serverError(res, error);
  }
});

// Update template item
router.put('/:id/items/:itemId', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const template = await AttendanceTemplate.findById(req.params.id);
    if (!template) {
      return notFound(res, 'Şablon bulunamadı');
    }

    // Check access
    if (template.isDefault && req.user.role.name !== 'super_admin') {
      return forbidden(res);
    }
    if (!template.isDefault && template.company && 
        req.user.role.name !== 'super_admin' &&
        req.user.company.toString() !== template.company.toString()) {
      return forbidden(res);
    }

    const item = await AttendanceTemplateItem.findOne({
      _id: req.params.itemId,
      template: template._id
    });

    if (!item) {
      return notFound(res, 'Öğe bulunamadı');
    }

    Object.assign(item, req.body);
    if (req.body.code) item.code = req.body.code.toUpperCase();
    await item.save();

    res.json(item);
  } catch (error) {
    return serverError(res, error);
  }
});

// Delete template item
router.delete('/:id/items/:itemId', auth, requireRole('super_admin', 'company_admin', 'resmi_muhasebe_ik'), async (req, res) => {
  try {
    const template = await AttendanceTemplate.findById(req.params.id);
    if (!template) {
      return notFound(res, 'Şablon bulunamadı');
    }

    // Check access
    if (template.isDefault && req.user.role.name !== 'super_admin') {
      return forbidden(res);
    }
    if (!template.isDefault && template.company && 
        req.user.role.name !== 'super_admin' &&
        req.user.company.toString() !== template.company.toString()) {
      return forbidden(res);
    }

    await AttendanceTemplateItem.findOneAndDelete({
      _id: req.params.itemId,
      template: template._id
    });

    res.json({ message: 'Öğe silindi' });
  } catch (error) {
    return serverError(res, error);
  }
});

module.exports = router;

