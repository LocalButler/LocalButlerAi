export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(zod|@google/genai)/)'
  ],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/serviceWorker.ts',
    '!src/setupTests.ts'
  ],
  coverageReporters: ['text', 'lcov']
};