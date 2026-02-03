/**
 * Phone Utils Unit Tests
 */

const {
  normalizePhone,
  isValidTurkishPhone,
  formatPhone,
  toInternationalFormat,
  normalizePhoneMiddleware
} = require('../../../utils/phoneUtils');

describe('PhoneUtils', () => {
  describe('normalizePhone', () => {
    it('bos deger icin bos string donmeli', () => {
      expect(normalizePhone(null)).toBe('');
      expect(normalizePhone(undefined)).toBe('');
      expect(normalizePhone('')).toBe('');
    });

    it('string olmayan degerler icin bos string donmeli', () => {
      expect(normalizePhone(123)).toBe('');
      expect(normalizePhone({})).toBe('');
      expect(normalizePhone([])).toBe('');
    });

    it('05XXXXXXXXX formatini dondurmeli', () => {
      expect(normalizePhone('05321234567')).toBe('05321234567');
    });

    it('5XXXXXXXXX formatini normalize etmeli', () => {
      expect(normalizePhone('5321234567')).toBe('05321234567');
    });

    it('+90 prefix\'ini kaldirmali', () => {
      expect(normalizePhone('+905321234567')).toBe('05321234567');
    });

    it('90 prefix\'ini kaldirmali', () => {
      expect(normalizePhone('905321234567')).toBe('05321234567');
    });

    it('bosluklu formati temizlemeli', () => {
      expect(normalizePhone('0532 123 45 67')).toBe('05321234567');
    });

    it('tireli formati temizlemeli', () => {
      expect(normalizePhone('0532-123-45-67')).toBe('05321234567');
    });

    it('parantezli formati temizlemeli', () => {
      expect(normalizePhone('(0532) 123 45 67')).toBe('05321234567');
    });

    it('karisik formati temizlemeli', () => {
      expect(normalizePhone('+90 (532) 123-45-67')).toBe('05321234567');
    });

    it('uzun numaralari 11 haneye kesmeli', () => {
      expect(normalizePhone('053212345678901')).toBe('05321234567');
    });

    it('farkli operator kodlarini kabul etmeli', () => {
      expect(normalizePhone('05551234567')).toBe('05551234567');
      expect(normalizePhone('05441234567')).toBe('05441234567');
      expect(normalizePhone('05301234567')).toBe('05301234567');
    });
  });

  describe('isValidTurkishPhone', () => {
    it('gecerli numara icin true donmeli', () => {
      expect(isValidTurkishPhone('05321234567')).toBe(true);
      expect(isValidTurkishPhone('05551234567')).toBe(true);
      expect(isValidTurkishPhone('05441234567')).toBe(true);
    });

    it('bos deger icin false donmeli', () => {
      expect(isValidTurkishPhone(null)).toBe(false);
      expect(isValidTurkishPhone('')).toBe(false);
    });

    it('eksik haneli numara icin false donmeli', () => {
      expect(isValidTurkishPhone('0532123456')).toBe(false); // 10 hane
      expect(isValidTurkishPhone('053212345')).toBe(false);  // 9 hane
    });

    it('gecersiz prefix icin false donmeli', () => {
      // 01, 02, 03, 04 gibi prefixler gecersiz
      expect(isValidTurkishPhone('01234567890')).toBe(false);
    });

    it('normalize edilmemis gecerli numara icin de calismali', () => {
      expect(isValidTurkishPhone('+90 532 123 45 67')).toBe(true);
      expect(isValidTurkishPhone('5321234567')).toBe(true);
    });

    it('tum operator kodlarini kabul etmeli', () => {
      // Turk Telekom, Vodafone, Turkcell
      expect(isValidTurkishPhone('05011234567')).toBe(true); // 50x
      expect(isValidTurkishPhone('05301234567')).toBe(true); // 53x
      expect(isValidTurkishPhone('05401234567')).toBe(true); // 54x
      expect(isValidTurkishPhone('05501234567')).toBe(true); // 55x
    });
  });

  describe('formatPhone', () => {
    it('dogru formatta dondurmeli', () => {
      expect(formatPhone('05321234567')).toBe('0532 123 45 67');
    });

    it('normalize edilmemis numarayi da formatlamali', () => {
      expect(formatPhone('5321234567')).toBe('0532 123 45 67');
    });

    it('kisa numara icin mumkun olani formatlamali', () => {
      expect(formatPhone('0532')).toBe('0532');
      expect(formatPhone('0532123')).toBe('0532 123');
    });

    it('bos deger icin bos string donmeli', () => {
      expect(formatPhone('')).toBe('');
      expect(formatPhone(null)).toBe('');
    });
  });

  describe('toInternationalFormat', () => {
    it('uluslararasi formatta dondurmeli', () => {
      expect(toInternationalFormat('05321234567')).toBe('+90 532 123 45 67');
    });

    it('normalize edilmemis numarayi da donusturmeli', () => {
      expect(toInternationalFormat('5321234567')).toBe('+90 532 123 45 67');
    });

    it('eksik haneli numara icin oldugu gibi donmeli', () => {
      expect(toInternationalFormat('053212345')).toBe('053212345');
    });

    it('bos deger icin bos string donmeli', () => {
      expect(toInternationalFormat('')).toBe('');
    });
  });

  describe('normalizePhoneMiddleware', () => {
    it('request body\'deki phone alanini normalize etmeli', () => {
      const middleware = normalizePhoneMiddleware(['phone']);
      const req = { body: { phone: '5321234567' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.phone).toBe('05321234567');
      expect(next).toHaveBeenCalled();
    });

    it('birden fazla alan icin calismali', () => {
      const middleware = normalizePhoneMiddleware(['phone', 'emergencyPhone']);
      const req = {
        body: {
          phone: '5321234567',
          emergencyPhone: '+90 555 111 22 33'
        }
      };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.phone).toBe('05321234567');
      expect(req.body.emergencyPhone).toBe('05551112233');
      expect(next).toHaveBeenCalled();
    });

    it('body yoksa hata vermemeli', () => {
      const middleware = normalizePhoneMiddleware(['phone']);
      const req = {};
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('alan yoksa atlamali', () => {
      const middleware = normalizePhoneMiddleware(['phone', 'mobile']);
      const req = { body: { phone: '5321234567' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.body.phone).toBe('05321234567');
      expect(req.body.mobile).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });
});
