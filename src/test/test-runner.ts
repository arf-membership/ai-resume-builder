/**
 * Test Runner Configuration
 * Provides utilities for running different types of tests
 */

import { describe, it } from 'vitest';

export interface TestSuite {
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance';
  files: string[];
  timeout?: number;
}

export const testSuites: TestSuite[] = [
  {
    name: 'Unit Tests - Components',
    type: 'unit',
    files: [
      'src/components/__tests__/**/*.test.tsx',
    ],
    timeout: 5000,
  },
  {
    name: 'Unit Tests - Hooks',
    type: 'unit',
    files: [
      'src/hooks/__tests__/**/*.test.ts',
    ],
    timeout: 5000,
  },
  {
    name: 'Unit Tests - Services',
    type: 'unit',
    files: [
      'src/services/__tests__/**/*.test.ts',
    ],
    timeout: 5000,
  },
  {
    name: 'Unit Tests - Utils',
    type: 'unit',
    files: [
      'src/utils/__tests__/**/*.test.ts',
    ],
    timeout: 5000,
  },
  {
    name: 'Unit Tests - Store',
    type: 'unit',
    files: [
      'src/store/__tests__/**/*.test.ts',
    ],
    timeout: 5000,
  },
  {
    name: 'Integration Tests',
    type: 'integration',
    files: [
      'src/test/integration/**/*.test.ts',
    ],
    timeout: 10000,
  },
  {
    name: 'End-to-End Tests',
    type: 'e2e',
    files: [
      'src/test/e2e/**/*.test.ts',
    ],
    timeout: 30000,
  },
  {
    name: 'Performance Tests',
    type: 'performance',
    files: [
      'src/test/performance/**/*.test.ts',
    ],
    timeout: 15000,
  },
];

export function getTestsByType(type: TestSuite['type']): TestSuite[] {
  return testSuites.filter(suite => suite.type === type);
}

export function getAllTestFiles(): string[] {
  return testSuites.flatMap(suite => suite.files);
}

export function getTestSuiteByName(name: string): TestSuite | undefined {
  return testSuites.find(suite => suite.name === name);
}

/**
 * Test coverage requirements by file type
 */
export const coverageRequirements = {
  components: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
  services: {
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90,
  },
  utils: {
    statements: 95,
    branches: 90,
    functions: 95,
    lines: 95,
  },
  hooks: {
    statements: 85,
    branches: 80,
    functions: 85,
    lines: 85,
  },
  overall: {
    statements: 85,
    branches: 80,
    functions: 85,
    lines: 85,
  },
};

/**
 * Test execution priorities
 */
export const testPriorities = {
  critical: [
    'src/services/__tests__/uploadService.test.ts',
    'src/components/__tests__/UploadZone.test.tsx',
    'src/hooks/__tests__/useAppState.test.ts',
  ],
  high: [
    'src/components/__tests__/AnalysisResults.test.tsx',
    'src/components/__tests__/CVCanvas.test.tsx',
    'src/services/__tests__/sectionEditService.test.ts',
  ],
  medium: [
    'src/components/__tests__/ChatInterface.test.tsx',
    'src/services/__tests__/chatService.test.ts',
    'src/utils/__tests__/**/*.test.ts',
  ],
  low: [
    'src/test/performance/**/*.test.ts',
  ],
};

/**
 * Test environment configurations
 */
export const testEnvironments = {
  unit: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  integration: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    timeout: 10000,
  },
  e2e: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    timeout: 30000,
  },
  performance: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    timeout: 15000,
  },
};

/**
 * Utility function to run tests with specific configuration
 */
export function createTestConfig(type: keyof typeof testEnvironments) {
  return {
    ...testEnvironments[type],
    include: getTestsByType(type as TestSuite['type']).flatMap(suite => suite.files),
  };
}