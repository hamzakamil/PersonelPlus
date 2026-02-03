/**
 * Leave Calculator Unit Tests
 */

const {
  calculateAnnualLeaveDays,
  calculateWorkingDays,
  calculateSeniority,
  calculateAge
} = require('../../../utils/leaveCalculator');

describe('LeaveCalculator', () => {
  describe('calculateAnnualLeaveDays', () => {
    it('1 yil kidem icin 14 gun donmeli', () => {
      expect(calculateAnnualLeaveDays(1, 30)).toBe(14);
    });

    it('4 yil kidem icin 14 gun donmeli', () => {
      expect(calculateAnnualLeaveDays(4, 30)).toBe(14);
    });

    it('5 yil kidem icin 20 gun donmeli', () => {
      expect(calculateAnnualLeaveDays(5, 30)).toBe(20);
    });

    it('14 yil kidem icin 20 gun donmeli', () => {
      expect(calculateAnnualLeaveDays(14, 30)).toBe(20);
    });

    it('15 yil kidem icin 26 gun donmeli', () => {
      expect(calculateAnnualLeaveDays(15, 30)).toBe(26);
    });

    it('20 yil kidem icin 26 gun donmeli', () => {
      expect(calculateAnnualLeaveDays(20, 30)).toBe(26);
    });

    it('18 yas alti icin minimum 20 gun olmali', () => {
      expect(calculateAnnualLeaveDays(1, 17)).toBe(20);
    });

    it('50 yas ve ustu icin minimum 20 gun olmali', () => {
      expect(calculateAnnualLeaveDays(1, 50)).toBe(20);
      expect(calculateAnnualLeaveDays(1, 55)).toBe(20);
    });

    it('50+ yas ve 15+ yil kidem icin 26 gun olmali', () => {
      // 15+ yil kidem 26 gun verir, 50+ yas minimum 20 gun verir
      // Math.max(26, 20) = 26
      expect(calculateAnnualLeaveDays(15, 55)).toBe(26);
    });

    it('yas belirtilmezse kidem bazli hesaplama yapilmali', () => {
      expect(calculateAnnualLeaveDays(1, null)).toBe(14);
      expect(calculateAnnualLeaveDays(5, undefined)).toBe(20);
    });
  });

  describe('calculateWorkingDays', () => {
    it('ayni gun icin 1 donmeli', () => {
      const date = new Date('2025-01-15'); // Carsamba
      expect(calculateWorkingDays(date, date, [0])).toBe(1);
    });

    it('pazartesiden cumaya 5 is gunu olmali', () => {
      const monday = new Date('2025-01-06');
      const friday = new Date('2025-01-10');
      expect(calculateWorkingDays(monday, friday, [0, 6])).toBe(5);
    });

    it('cumartesi ve pazar dahil edilmemeli (varsayilan)', () => {
      const monday = new Date('2025-01-06');
      const sunday = new Date('2025-01-12'); // 7 gun
      // Pazar disarida = 6 gun
      expect(calculateWorkingDays(monday, sunday, [0])).toBe(6);
    });

    it('hafta sonu 2 gun oldugunda dogru hesaplamali', () => {
      const monday = new Date('2025-01-06');
      const nextSunday = new Date('2025-01-12'); // 7 gun
      // Cumartesi ve Pazar disarida = 5 gun
      expect(calculateWorkingDays(monday, nextSunday, [0, 6])).toBe(5);
    });

    it('weekendLeaveDeduction=all tum gunleri saymali', () => {
      const monday = new Date('2025-01-06');
      const sunday = new Date('2025-01-12'); // 7 gun
      expect(calculateWorkingDays(monday, sunday, [0, 6], 'all')).toBe(7);
    });

    it('weekendLeaveDeduction=first_only sadece birincil gunu saymali', () => {
      const monday = new Date('2025-01-06');
      const sunday = new Date('2025-01-12'); // 7 gun
      // Cumartesi (6) birincil, Pazar (0) ikincil
      // first_only = birincil sayi, ikincil atla = Pazar atlanir = 6 gun
      expect(calculateWorkingDays(monday, sunday, [0, 6], 'first_only', 6)).toBe(6);
    });

    it('weekendLeaveDeduction=second_only ikincil gunu saymali', () => {
      const monday = new Date('2025-01-06');
      const sunday = new Date('2025-01-12'); // 7 gun
      // Cumartesi (6) birincil atlanir = 6 gun
      expect(calculateWorkingDays(monday, sunday, [0, 6], 'second_only', 6)).toBe(6);
    });

    it('2 haftalik izin hesaplamali', () => {
      const start = new Date('2025-01-06'); // Pazartesi
      const end = new Date('2025-01-17'); // Cuma (2. hafta)
      // 14 gun toplam, 4 hafta sonu gunu (2 Cmtesi + 2 Pazar) = 10 is gunu
      expect(calculateWorkingDays(start, end, [0, 6])).toBe(10);
    });
  });

  describe('calculateSeniority', () => {
    it('ise giris tarihi yoksa 0 donmeli', () => {
      expect(calculateSeniority(null)).toBe(0);
      expect(calculateSeniority(undefined)).toBe(0);
    });

    it('bu gun ise girenlerin kidemi 0 olmali', () => {
      const today = new Date();
      expect(calculateSeniority(today)).toBe(0);
    });

    it('1 yil once ise girenler icin 1 donmeli', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setMonth(oneYearAgo.getMonth() - 1); // Biraz fazla
      expect(calculateSeniority(oneYearAgo)).toBe(1);
    });

    it('5 yil once ise girenler icin 5 donmeli', () => {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      fiveYearsAgo.setMonth(fiveYearsAgo.getMonth() - 1);
      expect(calculateSeniority(fiveYearsAgo)).toBe(5);
    });

    it('string tarih ile de calismali', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 1);
      expect(calculateSeniority(twoYearsAgo.toISOString())).toBe(2);
    });
  });

  describe('calculateAge', () => {
    it('dogum tarihi yoksa null donmeli', () => {
      expect(calculateAge(null)).toBe(null);
      expect(calculateAge(undefined)).toBe(null);
    });

    it('30 yil onceki tarih icin yaklasik 30 donmeli', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 30);
      birthDate.setMonth(birthDate.getMonth() - 1); // Dogum gunu gecmis
      expect(calculateAge(birthDate)).toBe(30);
    });

    it('dogum gunu henuz gelmemisse bir yas eksik olmali', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 25);
      birthDate.setMonth(birthDate.getMonth() + 1); // Gelecek ay
      expect(calculateAge(birthDate)).toBe(24);
    });

    it('bu ay dogum gunu olan kisiler icin dogru hesaplamalı', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 40);
      // Aynı ay, ama geçmiş gün
      birthDate.setDate(1);
      const age = calculateAge(birthDate);
      // Bugunun gunu 1'den buyukse 40, degilse 39
      const today = new Date();
      if (today.getDate() >= 1) {
        expect(age).toBe(40);
      } else {
        expect(age).toBe(39);
      }
    });

    it('string tarih ile de calismali', () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 35);
      birthDate.setMonth(birthDate.getMonth() - 1);
      expect(calculateAge(birthDate.toISOString())).toBe(35);
    });
  });
});
