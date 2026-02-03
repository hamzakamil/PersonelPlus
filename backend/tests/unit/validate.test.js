/**
 * Validate Middleware Unit Tests
 */

const Joi = require('joi');
const validate = require('../../middleware/validate');
const { ValidationError } = require('../../utils/errors');

describe('validate middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {}
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('body validation', () => {
    const schema = {
      body: Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required()
      })
    };

    it('gecerli body ile next() cagirmali', () => {
      mockReq.body = { name: 'Test', email: 'test@example.com' };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('eksik alan ile ValidationError firlatmali', () => {
      mockReq.body = { name: 'Test' }; // email eksik

      expect(() => {
        validate(schema)(mockReq, mockRes, mockNext);
      }).toThrow(ValidationError);
    });

    it('gecersiz email ile ValidationError firlatmali', () => {
      mockReq.body = { name: 'Test', email: 'invalid-email' };

      expect(() => {
        validate(schema)(mockReq, mockRes, mockNext);
      }).toThrow(ValidationError);
    });

    it('hata detaylarini icermeli', () => {
      mockReq.body = {};

      try {
        validate(schema)(mockReq, mockRes, mockNext);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.errors).toBeDefined();
        expect(error.errors.length).toBeGreaterThan(0);
        expect(error.errors[0]).toHaveProperty('field');
        expect(error.errors[0]).toHaveProperty('message');
        expect(error.errors[0]).toHaveProperty('source', 'body');
      }
    });
  });

  describe('query validation', () => {
    const schema = {
      query: Joi.object({
        page: Joi.number().integer().min(1),
        limit: Joi.number().integer().min(1).max(100)
      })
    };

    it('gecerli query ile next() cagirmali', () => {
      mockReq.query = { page: '1', limit: '10' };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('gecersiz query ile ValidationError firlatmali', () => {
      mockReq.query = { page: '-1' };

      expect(() => {
        validate(schema)(mockReq, mockRes, mockNext);
      }).toThrow(ValidationError);
    });
  });

  describe('params validation', () => {
    const schema = {
      params: Joi.object({
        id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
      })
    };

    it('gecerli ObjectId ile next() cagirmali', () => {
      mockReq.params = { id: '507f1f77bcf86cd799439011' };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('gecersiz ObjectId ile ValidationError firlatmali', () => {
      mockReq.params = { id: 'invalid-id' };

      expect(() => {
        validate(schema)(mockReq, mockRes, mockNext);
      }).toThrow(ValidationError);
    });
  });

  describe('combined validation', () => {
    const schema = {
      params: Joi.object({
        id: Joi.string().required()
      }),
      body: Joi.object({
        name: Joi.string().required()
      }),
      query: Joi.object({
        active: Joi.boolean()
      })
    };

    it('tum alanlar gecerli ise next() cagirmali', () => {
      mockReq.params = { id: '123' };
      mockReq.body = { name: 'Test' };
      mockReq.query = { active: 'true' };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('birden fazla hatada tum hatalari toplamalı', () => {
      mockReq.params = {};
      mockReq.body = {};

      try {
        validate(schema)(mockReq, mockRes, mockNext);
      } catch (error) {
        expect(error.errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('stripUnknown behavior', () => {
    const schema = {
      body: Joi.object({
        name: Joi.string().required()
      })
    };

    it('bilinmeyen alanlari kabul etmeli (strip)', () => {
      mockReq.body = { name: 'Test', unknownField: 'value' };

      validate(schema)(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
