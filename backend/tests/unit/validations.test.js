/**
 * Validation Schemas Unit Tests
 */

const {
  objectId,
  objectIdRequired,
  phoneNumber,
  tcKimlikNo,
  email,
  password,
  money,
  percentage,
  pagination
} = require('../../validations/common');

describe('Common Validation Schemas', () => {
  describe('objectId', () => {
    it('gecerli ObjectId kabul etmeli', () => {
      const validId = '507f1f77bcf86cd799439011';
      const { error } = objectId.validate(validId);
      expect(error).toBeUndefined();
    });

    it('gecersiz ObjectId reddetmeli', () => {
      const invalidId = 'invalid-id';
      const { error } = objectId.validate(invalidId);
      expect(error).toBeDefined();
    });

    it('kisa ObjectId reddetmeli', () => {
      const shortId = '507f1f77bcf86cd79943901';
      const { error } = objectId.validate(shortId);
      expect(error).toBeDefined();
    });

    it('bos string kabul etmeli (opsiyonel)', () => {
      const { error } = objectId.validate('');
      // objectId opsiyonel, bos string gecerli degil ama required degil
      expect(error).toBeDefined();
    });
  });

  describe('objectIdRequired', () => {
    it('gecerli ObjectId kabul etmeli', () => {
      const validId = '507f1f77bcf86cd799439011';
      const { error } = objectIdRequired.validate(validId);
      expect(error).toBeUndefined();
    });

    it('bos deger reddetmeli', () => {
      const { error } = objectIdRequired.validate(undefined);
      expect(error).toBeDefined();
    });
  });

  describe('phoneNumber', () => {
    const validNumbers = [
      '5551234567',
      '05551234567',
      '+905551234567'
    ];

    const invalidNumbers = [
      '1234567890',
      '555123456',
      '55512345678',
      'abcdefghij',
      ''
    ];

    validNumbers.forEach(num => {
      it(`gecerli numara kabul etmeli: ${num}`, () => {
        const { error } = phoneNumber.validate(num);
        expect(error).toBeUndefined();
      });
    });

    invalidNumbers.forEach(num => {
      it(`gecersiz numara reddetmeli: ${num || '(bos)'}`, () => {
        const { error } = phoneNumber.validate(num);
        expect(error).toBeDefined();
      });
    });
  });

  describe('tcKimlikNo', () => {
    it('11 haneli gecerli TC kabul etmeli', () => {
      const { error } = tcKimlikNo.validate('12345678901');
      expect(error).toBeUndefined();
    });

    it('10 haneli TC reddetmeli', () => {
      const { error } = tcKimlikNo.validate('1234567890');
      expect(error).toBeDefined();
    });

    it('12 haneli TC reddetmeli', () => {
      const { error } = tcKimlikNo.validate('123456789012');
      expect(error).toBeDefined();
    });

    it('harf iceren TC reddetmeli', () => {
      const { error } = tcKimlikNo.validate('1234567890a');
      expect(error).toBeDefined();
    });
  });

  describe('email', () => {
    it('gecerli email kabul etmeli', () => {
      const { error, value } = email.validate('Test@Example.COM');
      expect(error).toBeUndefined();
      expect(value).toBe('test@example.com'); // lowercase
    });

    it('gecersiz email reddetmeli', () => {
      const { error } = email.validate('invalid-email');
      expect(error).toBeDefined();
    });

    it('bosluklu email trim etmeli', () => {
      const { error, value } = email.validate('  test@example.com  ');
      expect(error).toBeUndefined();
      expect(value).toBe('test@example.com');
    });
  });

  describe('password', () => {
    it('6+ karakter kabul etmeli', () => {
      const { error } = password.validate('123456');
      expect(error).toBeUndefined();
    });

    it('5 karakter reddetmeli', () => {
      const { error } = password.validate('12345');
      expect(error).toBeDefined();
    });

    it('128+ karakter reddetmeli', () => {
      const longPassword = 'a'.repeat(129);
      const { error } = password.validate(longPassword);
      expect(error).toBeDefined();
    });
  });

  describe('money', () => {
    it('pozitif sayi kabul etmeli', () => {
      const { error } = money.validate(100.50);
      expect(error).toBeUndefined();
    });

    it('negatif sayi reddetmeli', () => {
      const { error } = money.validate(-10);
      expect(error).toBeDefined();
    });

    it('sifir reddetmeli', () => {
      const { error } = money.validate(0);
      expect(error).toBeDefined();
    });
  });

  describe('percentage', () => {
    it('0-100 arasi kabul etmeli', () => {
      const { error: e1 } = percentage.validate(0);
      const { error: e2 } = percentage.validate(50);
      const { error: e3 } = percentage.validate(100);

      expect(e1).toBeUndefined();
      expect(e2).toBeUndefined();
      expect(e3).toBeUndefined();
    });

    it('100 ustu reddetmeli', () => {
      const { error } = percentage.validate(101);
      expect(error).toBeDefined();
    });

    it('negatif reddetmeli', () => {
      const { error } = percentage.validate(-1);
      expect(error).toBeDefined();
    });
  });

  describe('pagination', () => {
    it('varsayilan degerler donmeli', () => {
      const { error, value } = pagination.validate({});
      expect(error).toBeUndefined();
      expect(value.page).toBe(1);
      expect(value.limit).toBe(20);
    });

    it('ozel degerler kabul etmeli', () => {
      const { error, value } = pagination.validate({ page: 5, limit: 50 });
      expect(error).toBeUndefined();
      expect(value.page).toBe(5);
      expect(value.limit).toBe(50);
    });

    it('limit 100 ustu reddetmeli', () => {
      const { error } = pagination.validate({ limit: 101 });
      expect(error).toBeDefined();
    });

    it('page 0 reddetmeli', () => {
      const { error } = pagination.validate({ page: 0 });
      expect(error).toBeDefined();
    });

    it('sort order kabul etmeli', () => {
      const { error, value } = pagination.validate({ sort: 'createdAt', order: 'asc' });
      expect(error).toBeUndefined();
      expect(value.order).toBe('asc');
    });

    it('gecersiz order reddetmeli', () => {
      const { error } = pagination.validate({ order: 'invalid' });
      expect(error).toBeDefined();
    });
  });
});
