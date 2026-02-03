/**
 * AdvanceService Unit Tests
 * Pure fonksiyonlar icin birim testleri
 */

const advanceService = require('../../../services/advanceService');

describe('AdvanceService', () => {
  describe('calculateMonthsWorked', () => {
    it('ayni ay icin 0 donmeli', () => {
      const today = new Date();
      const result = advanceService.calculateMonthsWorked(today);
      expect(result).toBe(0);
    });

    it('1 ay once icin 1 donmeli', () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const result = advanceService.calculateMonthsWorked(oneMonthAgo);
      expect(result).toBe(1);
    });

    it('6 ay once icin 6 donmeli', () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const result = advanceService.calculateMonthsWorked(sixMonthsAgo);
      expect(result).toBe(6);
    });

    it('1 yil once icin 12 donmeli', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const result = advanceService.calculateMonthsWorked(oneYearAgo);
      expect(result).toBe(12);
    });

    it('gelecek tarih icin 0 veya negatif olmamali', () => {
      const future = new Date();
      future.setMonth(future.getMonth() + 3);
      const result = advanceService.calculateMonthsWorked(future);
      expect(result).toBe(0);
    });

    it('string tarih icin de calismali', () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const result = advanceService.calculateMonthsWorked(sixMonthsAgo.toISOString());
      expect(result).toBe(6);
    });
  });

  describe('createPaymentSchedule', () => {
    it('tek taksit icin dogru plan olusturmali', () => {
      const schedule = advanceService.createPaymentSchedule(1000, 1);

      expect(schedule).toHaveLength(1);
      expect(schedule[0].amount).toBe(1000);
      expect(schedule[0].paid).toBe(false);
    });

    it('birden fazla taksit icin tutari esit bolmeli', () => {
      const schedule = advanceService.createPaymentSchedule(3000, 3);

      expect(schedule).toHaveLength(3);
      schedule.forEach(item => {
        expect(item.amount).toBe(1000);
        expect(item.paid).toBe(false);
      });
    });

    it('5 taksit icin dogru tutar hesaplamali', () => {
      const schedule = advanceService.createPaymentSchedule(5000, 5);

      expect(schedule).toHaveLength(5);
      const totalAmount = schedule.reduce((sum, item) => sum + item.amount, 0);
      expect(totalAmount).toBe(5000);
    });

    it('her taksit icin farkli ay olmali', () => {
      const schedule = advanceService.createPaymentSchedule(3000, 3);

      const months = schedule.map(item => item.month);
      const uniqueMonths = new Set(months);
      expect(uniqueMonths.size).toBe(3);
    });

    it('gelecek aydan baslamali', () => {
      const schedule = advanceService.createPaymentSchedule(1000, 1);

      const currentDate = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const expectedMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
      expect(schedule[0].month).toBe(expectedMonth);
    });

    it('baslangic ayi verilirse ondan baslamali', () => {
      const startMonth = new Date('2025-06-15');
      const schedule = advanceService.createPaymentSchedule(1000, 1, startMonth);

      // Haziran 2025'ten sonraki ay Temmuz 2025
      expect(schedule[0].month).toBe('2025-07');
    });

    it('kalan tutar olmamali (toplamlar eslesmeli)', () => {
      const amount = 10000;
      const installments = 4;
      const schedule = advanceService.createPaymentSchedule(amount, installments);

      const totalScheduled = schedule.reduce((sum, item) => sum + item.amount, 0);
      expect(totalScheduled).toBe(amount);
    });
  });

  describe('calculatePerformanceScore', () => {
    const mockEmployee = { _id: 'emp1' };

    it('bos gecmis icin 100 donmeli', () => {
      const score = advanceService.calculatePerformanceScore(mockEmployee, []);
      expect(score).toBe(100);
    });

    it('zamaninda odenen her avans icin +2 puan (max 100)', () => {
      const history = [
        { status: 'APPROVED', remainingAmount: 0 },
        { status: 'APPROVED', remainingAmount: 0 }
      ];

      const score = advanceService.calculatePerformanceScore(mockEmployee, history);
      // 100 + 2 + 2 = 104, fakat max 100 ile sinirli
      expect(score).toBe(100);
    });

    it('gecikmeli her odeme icin -5 puan', () => {
      const history = [
        { status: 'APPROVED', remainingAmount: 500 },
        { status: 'APPROVED', remainingAmount: 1000 }
      ];

      const score = advanceService.calculatePerformanceScore(mockEmployee, history);
      expect(score).toBe(90); // 100 - 5 - 5
    });

    it('karisik gecmis icin dogru hesaplama', () => {
      const history = [
        { status: 'APPROVED', remainingAmount: 0 },   // +2
        { status: 'APPROVED', remainingAmount: 0 },   // +2
        { status: 'APPROVED', remainingAmount: 500 }  // -5
      ];

      const score = advanceService.calculatePerformanceScore(mockEmployee, history);
      expect(score).toBe(99); // 100 + 2 + 2 - 5
    });

    it('minimum 0 olmali', () => {
      const history = Array(30).fill({ status: 'APPROVED', remainingAmount: 100 });

      const score = advanceService.calculatePerformanceScore(mockEmployee, history);
      expect(score).toBe(0); // 100 - (30 * 5) = -50 -> 0
    });

    it('maksimum 100 olmali', () => {
      const history = Array(10).fill({ status: 'APPROVED', remainingAmount: 0 });

      const score = advanceService.calculatePerformanceScore(mockEmployee, history);
      expect(score).toBe(100); // 100 + (10 * 2) = 120 -> 100
    });

    it('iptal edilmis avanslar hesaba katilmamali', () => {
      const history = [
        { status: 'CANCELLED', remainingAmount: 0 },
        { status: 'REJECTED', remainingAmount: 0 }
      ];

      const score = advanceService.calculatePerformanceScore(mockEmployee, history);
      expect(score).toBe(100);
    });
  });
});
