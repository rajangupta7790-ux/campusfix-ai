import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Tests never call the real Gemini API. AI-specific tests switch it on and mock it.
    env: { NODE_ENV: 'test', AI_ENABLED: 'false' },
    testTimeout: 20000, // bcrypt is slow on purpose
    hookTimeout: 30000,
    fileParallelism: false,
  },
});