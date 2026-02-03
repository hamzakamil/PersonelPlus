/**
 * Custom Errors Unit Tests
 */

const {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
  BusinessError
} = require('../../utils/errors');

describe('Custom Errors', () => {
  describe('AppError', () => {
    it('temel ozellikleri dogru ayarlanmali', () => {
      const error = new AppError('Test hatasi', 400, 'TEST_ERROR');

      expect(error.message).toBe('Test hatasi');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.status).toBe('fail');
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('5xx hatalari icin status "error" olmali', () => {
      const error = new AppError('Server error', 500);

      expect(error.status).toBe('error');
    });

    it('4xx hatalari icin status "fail" olmali', () => {
      const error = new AppError('Client error', 404);

      expect(error.status).toBe('fail');
    });
  });

  describe('BadRequestError', () => {
    it('400 status code ile olusturulmali', () => {
      const error = new BadRequestError();

      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('BAD_REQUEST');
      expect(error.message).toBe('Gecersiz istek');
    });

    it('ozel mesaj kabul etmeli', () => {
      const error = new BadRequestError('Eksik parametre');

      expect(error.message).toBe('Eksik parametre');
    });
  });

  describe('UnauthorizedError', () => {
    it('401 status code ile olusturulmali', () => {
      const error = new UnauthorizedError();

      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('403 status code ile olusturulmali', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('404 status code ile olusturulmali', () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
      expect(error.message).toBe('Kayit bulunamadi');
    });

    it('ozel mesaj kabul etmeli', () => {
      const error = new NotFoundError('Kullanici bulunamadi');

      expect(error.message).toBe('Kullanici bulunamadi');
    });
  });

  describe('ConflictError', () => {
    it('409 status code ile olusturulmali', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('CONFLICT');
    });
  });

  describe('ValidationError', () => {
    it('422 status code ve errors array ile olusturulmali', () => {
      const errors = [{ field: 'email', message: 'Gecersiz' }];
      const error = new ValidationError('Dogrulama hatasi', errors);

      expect(error.statusCode).toBe(422);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(errors);
    });
  });

  describe('InternalError', () => {
    it('500 status code ile olusturulmali', () => {
      const error = new InternalError();

      expect(error.statusCode).toBe(500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(false);
    });
  });

  describe('BusinessError', () => {
    it('ozel error code ve status ile olusturulmali', () => {
      const error = new BusinessError('Kota asimi', 'QUOTA_EXCEEDED', 400);

      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('QUOTA_EXCEEDED');
      expect(error.message).toBe('Kota asimi');
    });
  });
});
