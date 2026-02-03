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
    const iyzipay = getIyzipay();

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

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      price: price.toFixed(2),
      paidPrice: price.toFixed(2),
      currency: Iyzipay.CURRENCY.TRY,
      basketId: `PKG_${pkg._id}`,
      paymentGroup: Iyzipay.PAYMENT_GROUP.SUBSCRIPTION,
      callbackUrl: callbackUrl || `${process.env.API_URL || 'http://localhost:3000'}/api/payments/callback`,
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
