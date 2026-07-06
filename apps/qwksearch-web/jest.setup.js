/**
 * Jest setup file for global test configuration
 */

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock environment variables
process.env.BETTER_AUTH_SECRET = 'test-secret-key-for-testing-purposes';
process.env.BETTER_AUTH_URL = 'http://localhost:3000';

// Suppress console errors during tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
