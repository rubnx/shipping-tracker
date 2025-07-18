"use strict";
// Jest setup file for API tests
// This file runs before each test suite
// Mock console methods to reduce noise during testing
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
// Set test timeout
jest.setTimeout(10000);
//# sourceMappingURL=setup.js.map