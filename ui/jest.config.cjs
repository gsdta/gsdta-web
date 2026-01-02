const nextJest = require('next/jest')

const createJestConfig = nextJest({dir: './'})

/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^canvas$': '<rootDir>/tests/__mocks__/canvas.js',
    },
    testPathIgnorePatterns: ['<rootDir>/tests/e2e/'],
    testTimeout: 15000,
    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        '!src/**/types/**',
        '!src/app/layout.tsx',
        '!src/app/**/layout.tsx',
        '!src/app/**/page.tsx',
        '!src/middleware.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
    coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
    coverageDirectory: '<rootDir>/coverage',
}

module.exports = createJestConfig(config)
