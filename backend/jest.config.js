/**
 * Jest Configuration - Backend
 * Unit ve Integration testler icin ayri projeler
 */

module.exports = {
  // Global ayarlar
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,

  projects: [
    // Unit testler - MongoDB gerektirmez
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testPathIgnorePatterns: ['/node_modules/'],
      testTimeout: 10000,
      clearMocks: true
    },
    // Integration testler - MongoDB Memory Server gerektirir
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testPathIgnorePatterns: ['/node_modules/'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 60000,
      clearMocks: true
    }
  ],

  // Coverage ayarlari (tum projeler icin)
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
