module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup.env.js'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  testTimeout: 15000,
  maxWorkers: 1,
};
