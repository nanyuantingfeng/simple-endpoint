module.exports = {
  preset: 'ts-jest',
  testRegex: '/__tests__/.*.spec.[tj]sx?$',
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/', '/models/', '/config/'],
  collectCoverageFrom: ['src/**/**.{ts,tsx}'],
  collectCoverage: true,
  globalSetup: './jest-config/setup.js',
  globalTeardown: './jest-config/teardown.js',
  testEnvironment: './jest-config/puppeteer_environment.js',
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: 'TS1192'
      }
    }
  }
}
