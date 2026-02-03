const Notification = require('../models/Notification');
const DeviceToken = require('../models/DeviceToken');
const NotificationPreference = require('../models/NotificationPreference');
const User = require('../models/User');
const emailService = require('./emailService');

class NotificationService {
  /**
   * Tek bir bildirim gönder
   * @param {Object} params Bildirim parametreleri
   * @returns {Promise<Notification>}
   */
  async send({
    recipient,
    recipientType,
    company,
    type,
    title,
    body,
    data,
    relatedModel,
    relatedId,
    priority = 'normal'
  }) {
    try {
      // 1. Kullanıcı tercihlerini al
      const preferences = await this.getUserPreferences(recipient);

      // 2. Notification kaydı oluştur
      const notification = new Notification({
        recipient,
        recipientType,
        company,
        type,
        title,
        body,
        data,
        relatedModel,
        relatedId,
        priority
      });

      // 3. In-App (her zaman kaydet)
      notification.channels.inApp.sent = true;
      notification.channels.inApp.sentAt = new Date();

      // 4. Push Bildirimi (tercih açıksa + cihaz varsa)
      if (preferences.canSendPush(type)) {
        await this.sendPush(notification);
      }

      // 5. Email (tercih açıksa veya urgent/high priority için)
      const shouldEmail = preferences.canSendEmail(type) ||
                          ['urgent', 'high'].includes(priority);
      if (shouldEmail && preferences.channels.email) {
        await this.sendEmail(notification);
      }

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Bildirim gönderme hatası:', error);
      throw error;
    }
  }

  /**
   * Toplu bildirim gönder (birden fazla alıcıya)
   * @param {Array} recipients Alıcı listesi
   * @param {Object} notificationData Bildirim verileri
   * @returns {Promise<Array>}
   */
  async sendBulk(recipients, notificationData) {
    const notifications = [];
    const errors = [];

    for (const recipient of recipients) {
      try {
        const notification = await this.send({
          ...notificationData,
          recipient: recipient._id || recipient.user || recipient,
          recipientType: recipient.role?.name || recipient.role || 'employee'
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Bildirim gönderilemedi (${recipient._id}):`, error.message);
        errors.push({ recipient: recipient._id, error: error.message });
      }
    }

    return { notifications, errors };
  }

  /**
   * Push bildirimi gönder
   * @param {Notification} notification Bildirim kaydı
   */
  async sendPush(notification) {
    try {
      const tokens = await DeviceToken.find({
        user: notification.recipient,
        isActive: true
      });

      if (tokens.length === 0) {
        notification.channels.push.error = 'Aktif cihaz token bulunamadı';
        return;
      }

      // TODO: Mobil uygulama hazır olunca Firebase/APNs entegrasyonu yapılacak
      // Bu kısım şimdilik placeholder
      // await pushService.send(tokens, {
      //   title: notification.title,
      //   body: notification.body,
      //   data: notification.data
      // });

      // Şimdilik sadece log atalım
      console.log(`[PUSH] ${tokens.length} cihaza bildirim gönderilecek:`, {
        title: notification.title,
        body: notification.body,
        type: notification.type
      });

      // Gelecekte FCM/APNs entegrasyonu yapılacağı için flag'i şimdilik true yapıyoruz
      // Gerçek implementasyonda başarı durumuna göre set edilecek
      notification.channels.push.sent = false; // Henüz gerçek push yok
      notification.channels.push.error = 'Push servisi henüz aktif değil (mobil uygulama bekleniyor)';
    } catch (error) {
      notification.channels.push.error = error.message;
      console.error('Push gönderme hatası:', error);
    }
  }

  /**
   * Email bildirimi gönder
   * @param {Notification} notification Bildirim kaydı
   */
  async sendEmail(notification) {
    try {
      const user = await User.findById(notification.recipient);
      if (!user?.email) {
        notification.channels.email.error = 'Email adresi bulunamadı';
        return;
      }

      // Email servisini çağır
      await emailService.sendNotificationEmail(user.email, {
        title: notification.title,
        body: notification.body,
        type: notification.type,
        priority: notification.priority,
        data: notification.data
      });

      notification.channels.email.sent = true;
      notification.channels.email.sentAt = new Date();
    } catch (error) {
      notification.channels.email.error = error.message;
      console.error('Email gönderme hatası:', error);
    }
  }

  /**
   * Kullanıcı tercihlerini getir (yoksa oluştur)
   * @param {ObjectId} userId Kullanıcı ID
   * @returns {Promise<NotificationPreference>}
   */
  async getUserPreferences(userId) {
    let prefs = await NotificationPreference.findOne({ user: userId });
    if (!prefs) {
      // Varsayılan tercihlerle oluştur
      prefs = await NotificationPreference.create({ user: userId });
    }
    return prefs;
  }

  /**
   * Okunmamış bildirim sayısı
   * @param {ObjectId} userId Kullanıcı ID
   * @returns {Promise<number>}
   */
  async getUnreadCount(userId) {
    return Notification.countDocuments({
      recipient: userId,
      isRead: false,
      isDeleted: false
    });
  }

  /**
   * Bildirimleri listele
   * @param {ObjectId} userId Kullanıcı ID
   * @param {Object} options Sayfalama ve filtre seçenekleri
   * @returns {Promise<Object>}
   */
  async getNotifications(userId, { page = 1, limit = 20, type, unreadOnly = false }) {
    const query = {
      recipient: userId,
      isDeleted: false
    };

    if (type) query.type = type;
    if (unreadOnly) query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments(query);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Bildirimi okundu olarak işaretle
   * @param {ObjectId} notificationId Bildirim ID
   * @param {ObjectId} userId Kullanıcı ID
   * @returns {Promise<Notification>}
   */
  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * Tüm bildirimleri okundu olarak işaretle
   * @param {ObjectId} userId Kullanıcı ID
   * @returns {Promise<Object>}
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Bildirimi sil (soft delete)
   * @param {ObjectId} notificationId Bildirim ID
   * @param {ObjectId} userId Kullanıcı ID
   * @returns {Promise<Notification>}
   */
  async deleteNotification(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Tüm bildirimleri sil (soft delete)
   * @param {ObjectId} userId Kullanıcı ID
   * @returns {Promise<Object>}
   */
  async deleteAllNotifications(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() }
    );
    return { modifiedCount: result.modifiedCount };
  }

  // ============================================
  // HAZIR BİLDİRİM ŞABLONLARI
  // ============================================

  /**
   * İzin Talebi Bildirimi
   */
  async sendLeaveRequestNotification(leaveRequest, approver) {
    const employee = leaveRequest.employee;
    const startDate = new Date(leaveRequest.startDate).toLocaleDateString('tr-TR');
    const endDate = new Date(leaveRequest.endDate).toLocaleDateString('tr-TR');

    return this.send({
      recipient: approver.user || approver._id,
      recipientType: approver.role?.name || 'company_admin',
      company: leaveRequest.company,
      type: 'LEAVE_REQUEST',
      title: 'Yeni İzin Talebi',
      body: `${employee.firstName} ${employee.lastName} ${startDate} - ${endDate} tarihleri için izin talebi oluşturdu.`,
      data: {
        leaveRequestId: leaveRequest._id,
        employeeId: employee._id,
        startDate,
        endDate
      },
      relatedModel: 'LeaveRequest',
      relatedId: leaveRequest._id
    });
  }

  /**
   * İzin Onay Bildirimi
   */
  async sendLeaveApprovedNotification(leaveRequest) {
    const startDate = new Date(leaveRequest.startDate).toLocaleDateString('tr-TR');
    const endDate = new Date(leaveRequest.endDate).toLocaleDateString('tr-TR');

    return this.send({
      recipient: leaveRequest.employee.user || leaveRequest.employee._id,
      recipientType: 'employee',
      company: leaveRequest.company,
      type: 'LEAVE_APPROVED',
      title: 'İzin Talebiniz Onaylandı',
      body: `${startDate} - ${endDate} tarihleri arasındaki izin talebiniz onaylandı.`,
      data: {
        leaveRequestId: leaveRequest._id,
        startDate,
        endDate
      },
      relatedModel: 'LeaveRequest',
      relatedId: leaveRequest._id,
      priority: 'high'
    });
  }

  /**
   * İzin Red Bildirimi
   */
  async sendLeaveRejectedNotification(leaveRequest, reason) {
    const startDate = new Date(leaveRequest.startDate).toLocaleDateString('tr-TR');
    const endDate = new Date(leaveRequest.endDate).toLocaleDateString('tr-TR');

    return this.send({
      recipient: leaveRequest.employee.user || leaveRequest.employee._id,
      recipientType: 'employee',
      company: leaveRequest.company,
      type: 'LEAVE_REJECTED',
      title: 'İzin Talebiniz Reddedildi',
      body: `${startDate} - ${endDate} tarihleri arasındaki izin talebiniz reddedildi.${reason ? ` Neden: ${reason}` : ''}`,
      data: {
        leaveRequestId: leaveRequest._id,
        startDate,
        endDate,
        reason
      },
      relatedModel: 'LeaveRequest',
      relatedId: leaveRequest._id,
      priority: 'high'
    });
  }

  /**
   * Avans Talebi Bildirimi
   */
  async sendAdvanceRequestNotification(advanceRequest, approver) {
    const employee = advanceRequest.employee;
    const amount = advanceRequest.amount.toLocaleString('tr-TR');

    return this.send({
      recipient: approver.user || approver._id,
      recipientType: approver.role?.name || 'company_admin',
      company: advanceRequest.company,
      type: 'ADVANCE_REQUEST',
      title: 'Yeni Avans Talebi',
      body: `${employee.firstName} ${employee.lastName} ${amount} TL avans talep etti.`,
      data: {
        advanceRequestId: advanceRequest._id,
        employeeId: employee._id,
        amount: advanceRequest.amount
      },
      relatedModel: 'AdvanceRequest',
      relatedId: advanceRequest._id
    });
  }

  /**
   * Avans Onay Bildirimi
   */
  async sendAdvanceApprovedNotification(advanceRequest) {
    const amount = advanceRequest.amount.toLocaleString('tr-TR');

    return this.send({
      recipient: advanceRequest.employee.user || advanceRequest.employee._id,
      recipientType: 'employee',
      company: advanceRequest.company,
      type: 'ADVANCE_APPROVED',
      title: 'Avans Talebiniz Onaylandı',
      body: `${amount} TL tutarındaki avans talebiniz onaylandı.`,
      data: {
        advanceRequestId: advanceRequest._id,
        amount: advanceRequest.amount
      },
      relatedModel: 'AdvanceRequest',
      relatedId: advanceRequest._id,
      priority: 'high'
    });
  }

  /**
   * Yeni Mesaj Bildirimi
   */
  async sendMessageNotification(message, recipient) {
    return this.send({
      recipient: recipient.user || recipient._id,
      recipientType: recipient.role?.name || 'employee',
      company: message.company,
      type: 'MESSAGE_RECEIVED',
      title: 'Yeni Mesaj',
      body: message.subject || 'Yeni bir mesajınız var.',
      data: {
        messageId: message._id,
        subject: message.subject
      },
      relatedModel: 'Message',
      relatedId: message._id
    });
  }

  /**
   * Sistem Bildirimi
   */
  async sendSystemNotification(recipient, title, body, data = {}) {
    return this.send({
      recipient: recipient.user || recipient._id,
      recipientType: recipient.role?.name || 'employee',
      company: recipient.company,
      type: 'SYSTEM',
      title,
      body,
      data,
      priority: 'normal'
    });
  }
}

module.exports = new NotificationService();
