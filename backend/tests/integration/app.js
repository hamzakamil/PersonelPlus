/**
 * Test Application
 * Integration testleri icin minimal Express app
 */

const express = require('express');
const { errorHandler, notFoundHandler } = require('../../middleware/errorHandler');

/**
 * Test icin Express app olustur
 * @param {Object} options - App opsiyonlari
 * @returns {Express} Express app
 */
const createTestApp = (options = {}) => {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Route'lari ekle (opsiyonel)
  if (options.routes) {
    options.routes.forEach(({ path, router }) => {
      app.use(path, router);
    });
  }

  // Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = { createTestApp };
