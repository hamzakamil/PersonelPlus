const Iyzipay = require('iyzipay');
const Payment = require('../models/Payment');
const DealerSubscription = require('../models/DealerSubscription');
const Dealer = require('../models/Dealer');
const emailService = require('./emailService');
const commissionService = require('./commissionService');

// iyzico configuration
const getIyzipay = () => {
  return new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY || 'sandbox-api-key',
    secretKey: process.env.IYZICO_SECRET_KEY || 'sandbox-secret-key',
    uri: process.env.IYZICO_URI || 'https://sandbox-api.iyzipay.com'
  });
};

const paymentService = {
  /**
   * Ödeme formu oluştur (3D Secure)
   * @param {Object} dealer - Bayi bilgileri
   * @param {Object} package - Paket bilgileri
   * @param {string} billingType - 'monthly' veya 'yearly'
   * @param {string} callbackUrl - Callback URL
   * @param {string} clientIp - Kullanici IP adresi
   * @returns {Object} iyzico checkout form response
   */
  async createCheckoutForm(dealer, pkg, billingType, callbackUrl, clientIp = '127.0.0.1') {
    const price = billingType === 'yearly'
      ? pkg.yearlyPrice
      : pkg.monthlyPrice;

    const conversationId = `SUB_${dealer._id}_${Date.now()}`;

    // Payment kaydı oluştur
    const payment = new Payment({
      dealer: dealer._id,
      package: pkg._id,
      amount: price,
      billingType,
      iyzicoConversationId: conversationId,
      status: 'pending'
    });
    await payment.save();

    // MOCK MODE - Geliştirme için fake ödeme formu
    if (process.env.PAYMENT_MOCK === 'true') {
      console.log('🧪 MOCK PAYMENT MODE - Fake checkout form oluşturuluyor');

      const mockToken = `MOCK_${payment._id}_${Date.now()}`;
      payment.iyzicoToken = mockToken;
      await payment.save();

      const mockCheckoutForm = `
        <div style="max-width: 500px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1e40af; margin: 0 0 10px 0;">🧪 TEST ÖDEME MODU</h3>
            <p style="color: #3b82f6; margin: 0; font-size: 14px;">Bu geliştirme ortamıdır. Gerçek ödeme yapılmayacak.</p>
          </div>

          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h4 style="margin: 0 0 15px 0; color: #374151;">Ödeme Detayları</h4>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #6b7280;">Paket:</span>
              <strong>${pkg.name}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #6b7280;">Ödeme Tipi:</span>
              <strong>${billingType === 'yearly' ? 'Yıllık' : 'Aylık'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #e5e7eb;">
              <span style="color: #374151; font-size: 18px;">Toplam:</span>
              <strong style="color: #3b82f6; font-size: 22px;">${price.toFixed(2)} TL</strong>
            </div>
          </div>

          <form method="POST" action="${callbackUrl || (process.env.API_URL || 'http://localhost:3333') + '/api/payments/callback'}">
            <input type="hidden" name="token" value="${mockToken}" />

            <button
              type="submit"
              style="
                width: 100%;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                border: none;
                padding: 16px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                transition: all 0.2s;
              "
              onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 8px rgba(0, 0, 0, 0.15)'"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)'"
            >
              ✅ Test Ödemeyi Tamamla (Ücretsiz)
            </button>
          </form>

          <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 15px;">
            ℹ️ Gerçek kredi kartı bilgisi girmenize gerek yok
          </p>
        </div>
      `;

      return {
        status: 'success',
        locale: 'tr',
        systemTime: Date.now(),
        conversationId,
        token: mockToken,
        checkoutFormContent: mockCheckoutForm,
        paymentPageUrl: '#mock-payment',
        paymentId: payment._id,
        isMockMode: true
      };
    }

    // GERÇEK IYZICO ENTEGRASYONU
    const iyzipay = getIyzipay();

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      price: price.toFixed(2),
      paidPrice: price.toFixed(2),
      currency: Iyzipay.CURRENCY.TRY,
      basketId: `PKG_${pkg._id}`,
      paymentGroup: Iyzipay.PAYMENT_GROUP.SUBSCRIPTION,
      callbackUrl: callbackUrl || `${process.env.API_URL || 'http://localhost:3333'}/api/payments/callback`,
      enabledInstallments: [1, 2, 3, 6],
      buyer: {
        id: dealer._id.toString(),
        name: dealer.contactPerson ? dealer.contactPerson.split(' ')[0] : dealer.name.split(' ')[0] || 'Bayi',
        surname: dealer.contactPerson ? (dealer.contactPerson.split(' ').slice(1).join(' ') || 'Yonetici') : (dealer.name.split(' ').slice(1).join(' ') || 'Yonetici'),
        gsmNumber: dealer.contactPhone || '+905000000000',
        email: dealer.contactEmail,
        identityNumber: dealer.taxNumber || '11111111111', // Vergi no veya TCKN
        lastLoginDate: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
        registrationDate: new Date(dealer.createdAt || Date.now()).toISOString().split('T')[0] + ' 00:00:00',
        registrationAddress: dealer.address || 'Turkiye',
        ip: clientIp,
        city: dealer.city || 'Istanbul',
        country: 'Turkey',
        zipCode: dealer.zipCode || '34000'
      },
      shippingAddress: {
        contactName: dealer.contactPerson || dealer.name,
        city: dealer.city || 'Istanbul',
        country: 'Turkey',
        address: dealer.address || 'Turkiye',
        zipCode: dealer.zipCode || '34000'
      },
      billingAddress: {
        contactName: dealer.contactPerson || dealer.name,
        city: dealer.city || 'Istanbul',
        country: 'Turkey',
        address: dealer.address || 'Turkiye',
        zipCode: dealer.zipCode || '34000'
      },
      basketItems: [{
        id: pkg._id.toString(),
        name: pkg.name,
        category1: 'Abonelik',
        category2: 'Paket',
        itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
        price: price.toFixed(2)
      }]
    };

    return new Promise((resolve, reject) => {
      iyzipay.checkoutFormInitialize.create(request, (err, result) => {
        if (err) {
          payment.status = 'failed';
          payment.errorMessage = err.message;
          payment.save();
          reject(err);
        } else {
          payment.iyzicoToken = result.token;
          payment.save();
          resolve({
            ...result,
            paymentId: payment._id
          });
        }
      });
    });
  },

  /**
   * Ödeme sonucunu doğrula
   * @param {string} token - iyzico token
   * @returns {Object} Ödeme sonucu
   */
  async verifyPayment(token) {
    // MOCK MODE - Fake ödeme doğrulama
    if (process.env.PAYMENT_MOCK === 'true' && token.startsWith('MOCK_')) {
      console.log('🧪 MOCK PAYMENT MODE - Fake payment verification');
      return {
        status: 'success',
        locale: 'tr',
        systemTime: Date.now(),
        conversationId: `CONV_${Date.now()}`,
        token: token,
        paymentId: `MOCK_PAY_${Date.now()}`,
        paymentStatus: 'SUCCESS',
        price: '100.00',
        paidPrice: '100.00',
        currency: 'TRY',
        basketId: 'MOCK_BASKET',
        cardType: 'CREDIT_CARD',
        cardAssociation: 'VISA',
        cardFamily: 'Bonus',
        lastFourDigits: '0000',
        installment: 1,
        fraudStatus: 0,
        merchantCommissionRate: '0.00',
        merchantCommissionRateAmount: '0.00',
        iyziCommissionRateAmount: '0.00',
        iyziCommissionFee: '0.00',
        cardUserKey: 'MOCK_CARD_USER',
        cardToken: 'MOCK_CARD_TOKEN'
      };
    }

    // GERÇEK IYZICO DOĞRULAMA
    const iyzipay = getIyzipay();

    return new Promise((resolve, reject) => {
      iyzipay.checkoutForm.retrieve({
        locale: Iyzipay.LOCALE.TR,
        token
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  },

  /**
   * Ödeme callback işlemi
   * @param {string} token - iyzico token
   * @returns {Object} İşlem sonucu
   */
  async handleCallback(token) {
    // Token ile ödeme kaydını bul
    const payment = await Payment.findOne({ iyzicoToken: token })
      .populate('dealer')
      .populate('package');

    if (!payment) {
      throw new Error('Ödeme kaydı bulunamadı');
    }

    // iyzico'dan ödeme durumunu sorgula
    const result = await this.verifyPayment(token);

    // Metadata kaydet
    payment.metadata = result;

    if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
      // Ödeme başarılı
      payment.status = 'completed';
      payment.iyzicoPaymentId = result.paymentId;
      payment.paidAt = new Date();

      if (result.cardType) {
        payment.cardType = result.cardType.toLowerCase();
      }
      if (result.lastFourDigits) {
        payment.cardLastFour = result.lastFourDigits;
      }

      await payment.save();

      // Abonelik oluştur
      const subscription = await this.createSubscriptionFromPayment(payment);

      // Fatura oluştur ve email gönder
      try {
        const invoiceService = require('./invoiceService');
        const invoice = await invoiceService.generateInvoice(payment._id);
        await invoiceService.sendInvoiceEmail(invoice._id);
        console.log(`✓ Invoice generated and sent: ${invoice.invoiceNumber}`);
      } catch (invoiceError) {
        console.error('Invoice generation/email error:', invoiceError);
        // Fatura hatası ödeme başarısını etkilemez
      }

      return {
        success: true,
        payment,
        subscription,
        message: 'Ödeme başarılı'
      };
    } else {
      // Ödeme başarısız
      payment.status = 'failed';
      payment.errorMessage = result.errorMessage || 'Ödeme başarısız';
      await payment.save();

      return {
        success: false,
        payment,
        message: result.errorMessage || 'Ödeme başarısız'
      };
    }
  },

  /**
   * Ödeme sonrası abonelik oluştur
   * @param {Object} payment - Payment kaydı
   * @returns {Object} DealerSubscription
   */
  async createSubscriptionFromPayment(payment) {
    const startDate = new Date();
    const endDate = new Date();

    if (payment.billingType === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Mevcut aktif aboneliği iptal et
    await DealerSubscription.updateMany(
      { dealer: payment.dealer._id, status: 'active' },
      { status: 'cancelled' }
    );

    // Yeni abonelik oluştur
    const subscription = new DealerSubscription({
      dealer: payment.dealer._id,
      package: payment.package._id,
      employeeQuota: payment.package.employeeLimit,
      billingType: payment.billingType,
      startDate,
      endDate,
      price: payment.amount,
      isPaid: true,
      paidAt: payment.paidAt,
      status: 'active',
      history: [{
        action: 'created',
        date: new Date(),
        note: `Ödeme ile oluşturuldu - ${payment.iyzicoPaymentId}`
      }]
    });

    await subscription.save();

    // Payment'a subscription referansı ekle
    payment.subscription = subscription._id;
    await payment.save();

    // Dealer'ı güncelle
    await Dealer.findByIdAndUpdate(payment.dealer._id, {
      activeSubscription: subscription._id,
      subscriptionStatus: 'active',
      employeeQuota: payment.package.employeeLimit,
      quotaExpiresAt: endDate
    });

    // *** YENİ: Otomatik kota dağıt ***
    try {
      const quotaService = require('./quotaService');
      const allocationResult = await quotaService.autoAllocateQuotaBasedOnEmployees(payment.dealer._id);
      console.log('✓ Otomatik kota dağıtıldı:', allocationResult);

      // Abonelik history'ye ekle
      subscription.history.push({
        action: 'quota_allocated',
        date: new Date(),
        note: `Otomatik kota dağıtımı: ${allocationResult.totalAllocated}/${allocationResult.totalQuota}`
      });
      await subscription.save();
    } catch (quotaError) {
      console.error('❌ Kota dağıtım hatası:', quotaError.message);
      // Hata ödeme başarısını etkilemez, devam et
    }

    // Komisyon oluştur
    try {
      const dealer = await Dealer.findById(payment.dealer._id);
      if (dealer) {
        await commissionService.createCommissionFromPayment(payment, dealer);
      }
    } catch (commissionError) {
      console.error('Komisyon olusturma hatasi:', commissionError.message);
    }

    // Email bildirimlerini gonder
    try {
      const dealer = await Dealer.findById(payment.dealer._id);
      if (dealer && dealer.contactEmail) {
        // Odeme basarili emaili
        await emailService.sendPaymentSuccessEmail(dealer, payment, payment.package);
        // Abonelik aktif emaili
        await emailService.sendSubscriptionCreatedEmail(dealer, subscription, payment.package);
      }
    } catch (emailError) {
      console.error('Email gonderme hatasi:', emailError.message);
    }

    return subscription;
  },

  /**
   * Manuel ödeme ile abonelik oluştur (super admin için)
   * @param {Object} data - Abonelik verileri
   * @param {string} createdBy - Oluşturan kullanıcı ID
   * @returns {Object} Abonelik ve ödeme kaydı
   */
  async createManualSubscription(data, createdBy) {
    const { dealerId, packageId, billingType, notes } = data;

    const dealer = await Dealer.findById(dealerId);
    const pkg = await require('../models/Package').findById(packageId);

    if (!dealer || !pkg) {
      throw new Error('Bayi veya paket bulunamadı');
    }

    const price = billingType === 'yearly' ? pkg.yearlyPrice : pkg.monthlyPrice;

    const startDate = new Date();
    const endDate = new Date();

    if (billingType === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Mevcut aktif aboneliği iptal et
    await DealerSubscription.updateMany(
      { dealer: dealerId, status: 'active' },
      { status: 'cancelled' }
    );

    // Abonelik oluştur
    const subscription = new DealerSubscription({
      dealer: dealerId,
      package: packageId,
      employeeQuota: pkg.employeeLimit,
      billingType,
      startDate,
      endDate,
      price,
      isPaid: true,
      paidAt: new Date(),
      status: 'active',
      createdBy,
      notes,
      history: [{
        action: 'created',
        date: new Date(),
        note: 'Manuel olarak oluşturuldu',
        performedBy: createdBy
      }]
    });

    await subscription.save();

    // Ödeme kaydı oluştur
    const payment = new Payment({
      dealer: dealerId,
      subscription: subscription._id,
      package: packageId,
      amount: price,
      billingType,
      status: 'completed',
      paymentMethod: 'manual',
      paidAt: new Date(),
      notes,
      createdBy
    });

    await payment.save();

    // Dealer'ı güncelle
    await Dealer.findByIdAndUpdate(dealerId, {
      activeSubscription: subscription._id,
      subscriptionStatus: 'active',
      employeeQuota: pkg.employeeLimit,
      quotaExpiresAt: endDate
    });

    // Komisyon oluştur
    try {
      await commissionService.createCommissionFromPayment(payment, dealer);
    } catch (commissionError) {
      console.error('Komisyon olusturma hatasi:', commissionError.message);
    }

    return { subscription, payment };
  },

  /**
   * İptal/İade işlemi
   * @param {string} paymentId - Payment ID
   * @param {string} reason - İptal nedeni
   * @param {string} performedBy - İşlemi yapan kullanıcı
   * @returns {Object} Sonuç
   */
  async refundPayment(paymentId, reason, performedBy) {
    const payment = await Payment.findById(paymentId)
      .populate('subscription');

    if (!payment) {
      throw new Error('Ödeme kaydı bulunamadı');
    }

    if (payment.status !== 'completed') {
      throw new Error('Sadece tamamlanmış ödemeler iade edilebilir');
    }

    // iyzico iade işlemi (eğer kredi kartı ödemesi ise)
    if (payment.paymentMethod === 'credit_card' && payment.iyzicoPaymentId) {
      const iyzipay = getIyzipay();

      const refundResult = await new Promise((resolve, reject) => {
        iyzipay.refund.create({
          locale: Iyzipay.LOCALE.TR,
          conversationId: `REFUND_${payment._id}_${Date.now()}`,
          paymentTransactionId: payment.iyzicoPaymentId,
          price: payment.amount.toFixed(2),
          currency: Iyzipay.CURRENCY.TRY,
          ip: '127.0.0.1'
        }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (refundResult.status !== 'success') {
        throw new Error(refundResult.errorMessage || 'İade işlemi başarısız');
      }
    }

    // Payment'ı güncelle
    payment.status = 'refunded';
    payment.refundedAt = new Date();
    payment.notes = (payment.notes || '') + `\nİade: ${reason}`;
    await payment.save();

    // Aboneliği iptal et
    if (payment.subscription) {
      await DealerSubscription.findByIdAndUpdate(payment.subscription._id, {
        status: 'cancelled',
        $push: {
          history: {
            action: 'cancelled',
            date: new Date(),
            note: `İade nedeniyle iptal: ${reason}`,
            performedBy
          }
        }
      });

      // Dealer'ı güncelle
      await Dealer.findByIdAndUpdate(payment.dealer, {
        activeSubscription: null,
        subscriptionStatus: 'none',
        employeeQuota: 0,
        quotaExpiresAt: null
      });
    }

    // Iade emaili gonder
    try {
      const dealer = await Dealer.findById(payment.dealer);
      if (dealer && dealer.contactEmail) {
        await emailService.sendRefundEmail(dealer, payment);
      }
    } catch (emailError) {
      console.error('Iade email gonderme hatasi:', emailError.message);
    }

    return {
      success: true,
      message: 'İade işlemi tamamlandı'
    };
  },

  /**
   * Ödeme geçmişini getir
   * @param {string} dealerId - Bayi ID
   * @returns {Array} Ödeme listesi
   */
  async getPaymentHistory(dealerId) {
    return Payment.find({ dealer: dealerId })
      .populate('package', 'name code employeeLimit')
      .populate('subscription', 'status billingType startDate endDate')
      .sort({ createdAt: -1 });
  }
};

module.exports = paymentService;
