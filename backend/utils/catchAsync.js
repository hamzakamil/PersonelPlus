/**
 * Async Handler Wrapper
 * Route handler'lardaki try-catch bloklarini otomatiklestirir
 * Hatalar global error handler'a yonlendirilir
 */

/**
 * Async fonksiyonlari sarar ve hatalari next() ile iletir
 * @param {Function} fn - Async route handler fonksiyonu
 * @returns {Function} - Express middleware fonksiyonu
 *
 * @example
 * // Onceki kullanim (try-catch ile):
 * router.get('/', async (req, res) => {
 *   try {
 *     const data = await Model.find();
 *     res.json({ success: true, data });
 *   } catch (error) {
 *     res.status(500).json({ message: error.message });
 *   }
 * });
 *
 * // Yeni kullanim (catchAsync ile):
 * router.get('/', catchAsync(async (req, res) => {
 *   const data = await Model.find();
 *   res.json({ success: true, data });
 * }));
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
