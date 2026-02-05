const nodemailer = require('nodemailer');

// Email transporter olustur
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Email gonder
const sendEmail = async (to, subject, html) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email gonderildi:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email gonderme hatasi:', error);
    return { success: false, error: error.message };
  }
};

// Abonelik olusturuldu bildirimi
const sendSubscriptionCreatedEmail = async (dealer, subscription, pkg) => {
  const subject = 'Aboneliginiz Aktif - Personel Yonetim Sistemi';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { color: #6b7280; }
        .value { font-weight: bold; }
        .success { color: #10B981; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Aboneliginiz Aktif!</h1>
        </div>
        <div class="content">
          <p>Merhaba <strong>${dealer.name}</strong>,</p>
          <p>Aboneliginiz basariyla aktiflestirilmistir. Asagida abonelik detaylarinizi bulabilirsiniz:</p>

          <div class="info-box">
            <div class="info-row">
              <span class="label">Paket:</span>
              <span class="value">${pkg.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Calisan Kotasi:</span>
              <span class="value">${subscription.employeeQuota} Calisan</span>
            </div>
            <div class="info-row">
              <span class="label">Fatura Tipi:</span>
              <span class="value">${subscription.billingType === 'yearly' ? 'Yillik' : 'Aylik'}</span>
            </div>
            <div class="info-row">
              <span class="label">Baslangic Tarihi:</span>
              <span class="value">${new Date(subscription.startDate).toLocaleDateString('tr-TR')}</span>
            </div>
            <div class="info-row">
              <span class="label">Bitis Tarihi:</span>
              <span class="value">${new Date(subscription.endDate).toLocaleDateString('tr-TR')}</span>
            </div>
            <div class="info-row">
              <span class="label">Durum:</span>
              <span class="value success">Aktif</span>
            </div>
          </div>

          <p>Sistemimizi kullandiginiz icin tesekkur ederiz.</p>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gonderilmistir. Lutfen yanit vermeyiniz.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yonetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(dealer.contactEmail, subject, html);
};

// Abonelik suresi dolmak uzere bildirimi
const sendSubscriptionExpiringEmail = async (dealer, subscription, daysRemaining) => {
  const subject = `Aboneliginiz ${daysRemaining} Gun Icinde Sona Erecek`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .warning-box { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .btn { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Abonelik Uyarisi</h1>
        </div>
        <div class="content">
          <p>Merhaba <strong>${dealer.name}</strong>,</p>

          <div class="warning-box">
            <p><strong>Dikkat!</strong> Aboneliginiz <strong>${daysRemaining} gun</strong> icinde sona erecektir.</p>
            <p>Bitis Tarihi: <strong>${new Date(subscription.endDate).toLocaleDateString('tr-TR')}</strong></p>
          </div>

          <p>Hizmet kesintisi yasamamak icin aboneliginizi yenilemenizi oneririz.</p>

          <p>Aboneliginiz sona erdiginde:</p>
          <ul>
            <li>Yeni calisan ekleyemezsiniz</li>
            <li>Bazi ozellikler kisitlanabilir</li>
            <li>Mevcut verileriniz korunur</li>
          </ul>

          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription" class="btn">Aboneligi Yenile</a>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gonderilmistir.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yonetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(dealer.contactEmail, subject, html);
};

// Abonelik suresi doldu bildirimi
const sendSubscriptionExpiredEmail = async (dealer, subscription) => {
  const subject = 'Aboneliginiz Sona Erdi';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .error-box { background: #FEE2E2; border: 1px solid #EF4444; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .btn { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Abonelik Sona Erdi</h1>
        </div>
        <div class="content">
          <p>Merhaba <strong>${dealer.name}</strong>,</p>

          <div class="error-box">
            <p>Aboneliginiz <strong>${new Date(subscription.endDate).toLocaleDateString('tr-TR')}</strong> tarihinde sona ermistir.</p>
          </div>

          <p>Hizmetlerimize tekrar erisim saglamak icin aboneliginizi yenilemeniz gerekmektedir.</p>

          <p><strong>Mevcut verileriniz guvendedir</strong> ve aboneliginizi yenilediginizde tekrar erisebilirsiniz.</p>

          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription" class="btn">Yeni Abonelik Al</a>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gonderilmistir.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yonetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(dealer.contactEmail, subject, html);
};

// Odeme basarili bildirimi
const sendPaymentSuccessEmail = async (dealer, payment, pkg) => {
  const subject = 'Odeme Onaylandi - Personel Yonetim Sistemi';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { color: #6b7280; }
        .value { font-weight: bold; }
        .total { font-size: 1.2em; color: #10B981; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Odeme Onaylandi</h1>
        </div>
        <div class="content">
          <p>Merhaba <strong>${dealer.name}</strong>,</p>
          <p>Odemeniz basariyla tamamlanmistir. Asagida odeme detaylarinizi bulabilirsiniz:</p>

          <div class="info-box">
            <div class="info-row">
              <span class="label">Paket:</span>
              <span class="value">${pkg.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Fatura Tipi:</span>
              <span class="value">${payment.billingType === 'yearly' ? 'Yillik' : 'Aylik'}</span>
            </div>
            <div class="info-row">
              <span class="label">Odeme Yontemi:</span>
              <span class="value">${payment.paymentMethod === 'credit_card' ? 'Kredi Karti' : 'Diger'}</span>
            </div>
            ${payment.cardLastFour ? `
            <div class="info-row">
              <span class="label">Kart:</span>
              <span class="value">**** ${payment.cardLastFour}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="label">Odeme Tarihi:</span>
              <span class="value">${new Date(payment.paidAt || payment.createdAt).toLocaleString('tr-TR')}</span>
            </div>
            <div class="info-row">
              <span class="label">Toplam Tutar:</span>
              <span class="value total">${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payment.amount)}</span>
            </div>
          </div>

          <p>Sistemimizi kullandiginiz icin tesekkur ederiz.</p>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gonderilmistir.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yonetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(dealer.contactEmail, subject, html);
};

// Iade bildirimi
const sendRefundEmail = async (dealer, payment) => {
  const subject = 'Odeme Iade Edildi - Personel Yonetim Sistemi';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6366F1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: #EEF2FF; border: 1px solid #6366F1; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Iade Islemi Tamamlandi</h1>
        </div>
        <div class="content">
          <p>Merhaba <strong>${dealer.name}</strong>,</p>

          <div class="info-box">
            <p><strong>${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payment.amount)}</strong> tutarindaki odemeniz iade edilmistir.</p>
            <p>Iade Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
          </div>

          <p>Iade tutari 3-5 is gunu icinde hesabiniza yansiyacaktir.</p>

          <p>Sorulariniz icin bizimle iletisime gecebilirsiniz.</p>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gonderilmistir.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yonetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(dealer.contactEmail, subject, html);
};

// Çalışan aktivasyon e-postası (şifre belirleme linki)
const sendEmployeeActivationEmail = async (employee, company, activationToken) => {
  const activationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate/${activationToken}`;
  const subject = `${company.name || 'Şirketiniz'} - Hesabınızı Aktive Edin`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4F46E5; }
        .warning { color: #DC2626; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Hoş Geldiniz!</h1>
        </div>
        <div class="content">
          <p>Merhaba <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
          <p><strong>${company.name || 'Şirketiniz'}</strong> sizi Personel Yönetim Sistemine ekledi.</p>

          <div class="info-box">
            <p><strong>Email:</strong> ${employee.email}</p>
          </div>

          <p>Hesabınızı aktive etmek ve şifrenizi belirlemek için aşağıdaki butona tıklayın:</p>

          <center>
            <a href="${activationUrl}" class="btn">Hesabımı Aktive Et</a>
          </center>

          <p class="warning"><strong>Not:</strong> Bu link 7 gün geçerlidir.</p>

          <p style="color: #6B7280; font-size: 14px;">
            Veya bu linki tarayıcınıza yapıştırın:<br>
            <a href="${activationUrl}" style="color: #4F46E5; word-break: break-all;">${activationUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yönetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(employee.email, subject, html);
};

// İşe giriş/çıkış talebi onaylandı bildirimi
const sendEmploymentApprovedNotification = async (preRecord, company, recipientEmail) => {
  const processTypeTr = preRecord.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış';
  const subject = `${processTypeTr} Talebi Onaylandı - ${company.name || 'Şirket'}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .info-row { padding: 8px 0; border-bottom: 1px solid #eee; }
        .label { color: #6b7280; font-size: 14px; }
        .value { font-weight: bold; }
        .success { color: #10B981; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${processTypeTr} Talebi Onaylandı</h1>
        </div>
        <div class="content">
          <p>${processTypeTr} talebiniz onaylanmıştır.</p>

          <div class="info-box">
            <div class="info-row">
              <div class="label">Çalışan</div>
              <div class="value">${preRecord.candidateFullName || '-'}</div>
            </div>
            <div class="info-row">
              <div class="label">TC Kimlik No</div>
              <div class="value">${preRecord.tcKimlikNo || '-'}</div>
            </div>
            <div class="info-row">
              <div class="label">Tarih</div>
              <div class="value">${preRecord.processType === 'hire'
                ? new Date(preRecord.hireDate).toLocaleDateString('tr-TR')
                : new Date(preRecord.terminationDate).toLocaleDateString('tr-TR')}</div>
            </div>
            <div class="info-row">
              <div class="label">Durum</div>
              <div class="value success">✓ Onaylandı</div>
            </div>
          </div>

          ${preRecord.employeeCreated === false ? `
          <p style="background: #FEF3C7; padding: 15px; border-radius: 8px; border-left: 4px solid #F59E0B;">
            <strong>Dikkat:</strong> Çalışan kaydı otomatik oluşturulmadı.
            Çalışanı sisteme eklemek için "Çalışan Olarak Ekle" butonunu kullanabilirsiniz.
          </p>
          ` : ''}
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gönderilmiştir.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yönetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(recipientEmail, subject, html);
};

// Düzeltme talebi bildirimi
const sendRevisionRequestNotification = async (preRecord, company, reason, recipientEmail) => {
  const processTypeTr = preRecord.processType === 'hire' ? 'İşe Giriş' : 'İşten Çıkış';
  const subject = `${processTypeTr} Talebi - Düzeltme İstendi`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .reason-box { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #F59E0B; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Düzeltme Talebi</h1>
        </div>
        <div class="content">
          <p><strong>${company.name || 'Şirket'}</strong> için gönderdiğiniz ${processTypeTr.toLowerCase()} talebinde düzeltme istendi.</p>

          <div class="info-box">
            <p><strong>Çalışan:</strong> ${preRecord.candidateFullName || '-'}</p>
            <p><strong>TC Kimlik No:</strong> ${preRecord.tcKimlikNo || '-'}</p>
          </div>

          <div class="reason-box">
            <p><strong>Düzeltme Nedeni:</strong></p>
            <p>${reason}</p>
          </div>

          <p>Lütfen belirtilen düzeltmeleri yaparak talebi tekrar gönderin.</p>

          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/employment" class="btn">Talepleri Görüntüle</a>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gönderilmiştir.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yönetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(recipientEmail, subject, html);
};

// Yeni mesaj bildirimi
const sendNewMessageNotification = async (recipient, message, sender) => {
  const subject = `Yeni Mesaj: ${message.subject || 'Bildirim'}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6366F1; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .message-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .sender { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
        .btn { display: inline-block; background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Yeni Mesajınız Var</h1>
        </div>
        <div class="content">
          <p>Merhaba,</p>
          <p>Size yeni bir mesaj gönderildi.</p>

          <div class="message-box">
            <div class="sender">
              <strong>Gönderen:</strong> ${sender?.email || 'Sistem'}
            </div>
            <p><strong>Konu:</strong> ${message.subject || '-'}</p>
            <p>${message.content?.substring(0, 200)}${message.content?.length > 200 ? '...' : ''}</p>
          </div>

          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/messages" class="btn">Mesajları Görüntüle</a>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gönderilmiştir.</p>
          <p>Email bildirimlerini ayarlarınızdan kapatabilirsiniz.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yönetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(recipient.email, subject, html);
};

// Genel bildirim e-postası (notificationService tarafından kullanılır)
const sendNotificationEmail = async (toEmail, { title, body, type, priority, data }) => {
  // Önceliğe göre renk belirle
  const priorityColors = {
    urgent: '#DC2626', // Kırmızı
    high: '#F59E0B',   // Turuncu
    normal: '#3B82F6', // Mavi
    low: '#6B7280'     // Gri
  };

  // Bildirim tipine göre ikon belirle
  const typeIcons = {
    LEAVE_REQUEST: '📋',
    LEAVE_APPROVED: '✅',
    LEAVE_REJECTED: '❌',
    ADVANCE_REQUEST: '💰',
    ADVANCE_APPROVED: '✅',
    ADVANCE_REJECTED: '❌',
    OVERTIME_REQUEST: '⏰',
    OVERTIME_APPROVED: '✅',
    OVERTIME_REJECTED: '❌',
    MESSAGE_RECEIVED: '📩',
    EMPLOYMENT_STATUS: '👤',
    EXPENSE_REQUEST: '🧾',
    EXPENSE_APPROVED: '✅',
    SYSTEM: '🔔',
    REMINDER: '⏰',
    ANNOUNCEMENT: '📢'
  };

  const headerColor = priorityColors[priority] || priorityColors.normal;
  const icon = typeIcons[type] || '🔔';

  const subject = `${icon} ${title}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 20px; }
        .content { background: #f9fafb; padding: 25px; border-radius: 0 0 8px 8px; }
        .message-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .priority-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
        .priority-urgent { background: #FEE2E2; color: #DC2626; }
        .priority-high { background: #FEF3C7; color: #D97706; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${icon} ${title}</h1>
          ${priority === 'urgent' || priority === 'high' ? `
            <span class="priority-badge priority-${priority}">
              ${priority === 'urgent' ? 'ACİL' : 'ÖNEMLİ'}
            </span>
          ` : ''}
        </div>
        <div class="content">
          <div class="message-box">
            <p style="margin: 0; font-size: 16px;">${body}</p>
          </div>

          ${data && Object.keys(data).length > 0 ? `
            <p style="color: #6B7280; font-size: 14px;">
              Detayları görmek için sisteme giriş yapabilirsiniz.
            </p>
          ` : ''}

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="btn">
              Sisteme Git
            </a>
          </center>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gönderilmiştir.</p>
          <p>Bildirim tercihlerinizi ayarlar sayfasından değiştirebilirsiniz.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yönetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(toEmail, subject, html);
};

// Bordro yüklendi bildirimi
const sendBordroUploadedEmail = async (employee, bordro, company) => {
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const periodText = `${monthNames[bordro.month - 1]} ${bordro.year}`;

  const subject = `${company.name || 'Şirket'} - ${periodText} Bordronuz Yüklendi`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Yeni Bordronuz Yüklendi</h1>
        </div>
        <div class="content">
          <p>Merhaba <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
          <p><strong>${periodText}</strong> dönemi bordronuz sisteme yüklenmiştir.</p>

          <div class="info-box">
            <p><strong>Dönem:</strong> ${periodText}</p>
            <p><strong>Net Ücret:</strong> ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(bordro.payrollData?.netUcret || 0)}</p>
          </div>

          <div class="warning">
            <strong>Önemli:</strong> Bordronuzu inceleyerek onaylayınız. Onay işlemini tamamlamak için sisteme giriş yapmanız gerekmektedir.
          </div>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-bordros" class="btn">
              Bordromu Görüntüle
            </a>
          </center>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gönderilmiştir.</p>
          <p>&copy; ${new Date().getFullYear()} ${company.name || 'Personel Yönetim Sistemi'}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(employee.email, subject, html);
};

// Bordro onay kodu gönder
const sendBordroApprovalCodeEmail = async (employee, code, expiresAt) => {
  const subject = 'Bordro Onay Kodu';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .code-box { background: #1F2937; color: #10B981; font-size: 32px; font-family: monospace; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
        .warning { color: #DC2626; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bordro Onay Kodu</h1>
        </div>
        <div class="content">
          <p>Merhaba <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
          <p>Bordronuzu onaylamak için aşağıdaki kodu kullanınız:</p>

          <div class="code-box">
            ${code}
          </div>

          <p class="warning">
            <strong>Bu kod 15 dakika içerisinde geçerlidir.</strong><br>
            Son geçerlilik: ${new Date(expiresAt).toLocaleString('tr-TR')}
          </p>

          <p style="color: #6B7280; font-size: 14px;">
            Eğer bu isteği siz yapmadıysanız, bu emaili dikkate almayınız.
          </p>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gönderilmiştir.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yönetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(employee.email, subject, html);
};

// Bordro reddedildi bildirimi (bayiye gönderilir)
const sendBordroRejectedEmail = async (company, employee, bordro) => {
  const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const periodText = `${monthNames[bordro.month - 1]} ${bordro.year}`;

  const subject = `Bordro Reddedildi - ${employee.firstName} ${employee.lastName} - ${periodText}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        .reason-box { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Bordro Reddedildi</h1>
        </div>
        <div class="content">
          <p>Bir çalışan bordrosunu reddetti ve itiraz etti.</p>

          <div class="info-box">
            <p><strong>Şirket:</strong> ${company.name || '-'}</p>
            <p><strong>Çalışan:</strong> ${employee.firstName} ${employee.lastName}</p>
            <p><strong>TC Kimlik No:</strong> ${bordro.tcKimlik}</p>
            <p><strong>Dönem:</strong> ${periodText}</p>
            <p><strong>Net Ücret:</strong> ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(bordro.payrollData?.netUcret || 0)}</p>
            <p><strong>Red Tarihi:</strong> ${new Date(bordro.rejectedAt).toLocaleString('tr-TR')}</p>
          </div>

          <div class="reason-box">
            <p><strong>İtiraz Sebebi:</strong></p>
            <p>${bordro.rejectionReason || '-'}</p>
          </div>

          <center>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/bordro-list" class="btn">
              Bordroları Görüntüle
            </a>
          </center>
        </div>
        <div class="footer">
          <p>Bu email otomatik olarak gönderilmiştir.</p>
          <p>&copy; ${new Date().getFullYear()} Personel Yönetim Sistemi</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Şirketin bayisinin email adresine gönder
  // Company'den dealer bilgisini almak için populate edilmiş olmalı
  // Burada company.contactEmail veya dealer email kullanılabilir
  const recipientEmail = company.contactEmail || company.authorizedPerson?.email;

  if (recipientEmail) {
    return sendEmail(recipientEmail, subject, html);
  }

  return { success: false, error: 'Alıcı email adresi bulunamadı' };
};

module.exports = {
  createTransporter,
  sendEmail,
  sendSubscriptionCreatedEmail,
  sendSubscriptionExpiringEmail,
  sendSubscriptionExpiredEmail,
  sendPaymentSuccessEmail,
  sendRefundEmail,
  sendEmployeeActivationEmail,
  sendEmploymentApprovedNotification,
  sendRevisionRequestNotification,
  sendNewMessageNotification,
  sendNotificationEmail,
  sendBordroUploadedEmail,
  sendBordroApprovalCodeEmail,
  sendBordroRejectedEmail
};
