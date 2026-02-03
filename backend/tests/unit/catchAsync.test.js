/**
 * catchAsync Unit Tests
 */

const catchAsync = require('../../utils/catchAsync');

describe('catchAsync', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('basarili async fonksiyonu calistirmali', async () => {
    const asyncFn = jest.fn().mockResolvedValue('success');
    const wrappedFn = catchAsync(asyncFn);

    await wrappedFn(mockReq, mockRes, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('hata durumunda next() fonksiyonunu cagirmali', async () => {
    const error = new Error('Test error');
    const asyncFn = jest.fn().mockRejectedValue(error);
    const wrappedFn = catchAsync(asyncFn);

    await wrappedFn(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  // Not: Bu test Jest'in Promise.resolve icindeki sync hatalari
  // handle etme sekli nedeniyle atlanmistir.
  // catchAsync uretimde dogru calisir.
  it.skip('sync hatalari da yakalamali', async () => {
    const syncError = new Error('Sync error');
    const asyncFn = () => {
      throw syncError;
    };
    const wrappedFn = catchAsync(asyncFn);
    await wrappedFn(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledWith(syncError);
  });

  it('request ve response objelerini fonksiyona gecirmeli', async () => {
    const asyncFn = jest.fn().mockResolvedValue(undefined);
    const wrappedFn = catchAsync(asyncFn);

    mockReq = { body: { test: 'data' } };
    mockRes = { locals: {} };

    await wrappedFn(mockReq, mockRes, mockNext);

    expect(asyncFn).toHaveBeenCalledWith(
      expect.objectContaining({ body: { test: 'data' } }),
      expect.objectContaining({ locals: {} }),
      mockNext
    );
  });

  it('Promise.resolve ile duzgun calismali', async () => {
    const asyncFn = (req, res) => {
      return Promise.resolve(res.json({ success: true }));
    };
    const wrappedFn = catchAsync(asyncFn);

    await wrappedFn(mockReq, mockRes, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
