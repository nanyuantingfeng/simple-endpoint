module.exports = {
  preset: 'ts-jest',
  testRegex: '/__tests__/.*.spec.[tj]sx?$',
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/', '/models/', '/config/'],
  collectCoverageFrom: ['src/**/**.{ts,tsx}'],
  collectCoverage: false,
  globalSetup: './jest-config/setup.js',
  globalTeardown: './jest-config/teardown.js',
  testEnvironment: './jest-config/environment.js',
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: 'TS1192'
      }
    }
  }
}
