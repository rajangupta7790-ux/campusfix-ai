import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 20000, // bcrypt is slow on purpose
    hookTimeout: 30000,
    fileParallelism: false,
  },
});