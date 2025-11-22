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
}

module.exports = createJestConfig(config)
