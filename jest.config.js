module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageThreshold: {
    'src/analyzer.ts': {
      branches: 75,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    'src/scorer.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
