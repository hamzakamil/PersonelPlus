/**
 * Response Helper Unit Tests
 */

const {
  successResponse,
  errorResponse,
  notFound,
  forbidden,
  unauthorized,
  validationError,
  paginationMeta
} = require('../../utils/responseHelper');

// Mock Express response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Response Helper', () => {
  describe('successResponse', () => {
    it('varsayilan degerlerle basarili response donmeli', () => {
      const res = mockResponse();

      successResponse(res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Islem basarili'
      });
    });

    it('ozel data ve message ile response donmeli', () => {
      const res = mockResponse();
      const data = { id: 1, name: 'Test' };

      successResponse(res, { data, message: 'Kayit bulundu' });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Kayit bulundu'
      });
    });

    it('meta bilgisi ile response donmeli', () => {
      const res = mockResponse();
      const data = [{ id: 1 }];
      const meta = { page: 1, limit: 10, total: 100 };

      successResponse(res, { data, meta });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          meta
        })
      );
    });

    it('ozel status code donmeli', () => {
      const res = mockResponse();

      successResponse(res, { statusCode: 201 });

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('errorResponse', () => {
    it('varsayilan hata response donmeli', () => {
      const res = mockResponse();

      errorResponse(res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: 'Bir hata olustu'
      });
    });

    it('ozel hata mesaji ve status code donmeli', () => {
      const res = mockResponse();

      errorResponse(res, { message: 'Ozel hata', statusCode: 422 });

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Ozel hata'
        })
      );
    });

    it('error code ile response donmeli', () => {
      const res = mockResponse();

      errorResponse(res, { message: 'Hata', errorCode: 'CUSTOM_ERROR' });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errorCode: 'CUSTOM_ERROR'
        })
      );
    });

    it('errors array ile response donmeli', () => {
      const res = mockResponse();
      const errors = [{ field: 'email', message: 'Gecersiz' }];

      errorResponse(res, { errors });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors
        })
      );
    });
  });

  describe('notFound', () => {
    it('404 status ile response donmeli', () => {
      const res = mockResponse();

      notFound(res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Kayit bulunamadi',
          errorCode: 'NOT_FOUND'
        })
      );
    });

    it('ozel mesaj ile 404 donmeli', () => {
      const res = mockResponse();

      notFound(res, 'Kullanici bulunamadi');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Kullanici bulunamadi'
        })
      );
    });
  });

  describe('forbidden', () => {
    it('403 status ile response donmeli', () => {
      const res = mockResponse();

      forbidden(res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'FORBIDDEN'
        })
      );
    });
  });

  describe('unauthorized', () => {
    it('401 status ile response donmeli', () => {
      const res = mockResponse();

      unauthorized(res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'UNAUTHORIZED'
        })
      );
    });
  });

  describe('validationError', () => {
    it('422 status ve errors array ile response donmeli', () => {
      const res = mockResponse();
      const errors = [
        { field: 'email', message: 'Gecersiz format' },
        { field: 'name', message: 'Zorunlu alan' }
      ];

      validationError(res, errors);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors,
          errorCode: 'VALIDATION_ERROR'
        })
      );
    });
  });

  describe('paginationMeta', () => {
    it('sayfalama meta bilgisi donmeli', () => {
      const meta = paginationMeta(1, 10, 100);

      expect(meta).toEqual({
        page: 1,
        limit: 10,
        total: 100,
        totalPages: 10,
        hasNext: true,
        hasPrev: false
      });
    });

    it('son sayfa icin hasNext false olmali', () => {
      const meta = paginationMeta(10, 10, 100);

      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(true);
    });

    it('tek sayfa icin hasNext ve hasPrev false olmali', () => {
      const meta = paginationMeta(1, 10, 5);

      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
      expect(meta.totalPages).toBe(1);
    });
  });
});
