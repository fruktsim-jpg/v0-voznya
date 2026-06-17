import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// Vitest config for the site's pure-logic unit tests (no DB, no React).
// - `@/` alias mirrors tsconfig paths so imports match app code.
// - `server-only` is a Next.js build-time guard with no runtime behavior; we
//   stub it so server-only modules (e.g. lib/season.ts) import cleanly in tests.
export default defineConfig({
  resolve: {
    alias: {
      'server-only': resolve(__dirname, 'test/stubs/server-only.ts'),
      '@': resolve(__dirname),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
})
