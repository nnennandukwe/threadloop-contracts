import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // A hang detector, not a performance budget: every test here is in-process and finishes in well under a second.
    testTimeout: 30_000,
  },
});
