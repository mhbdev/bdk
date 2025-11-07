import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
      exclude: ['dist/**', 'examples/**', 'tests/**', 'src/providers/**'],
    },
  },
});