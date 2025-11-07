import { defineConfig } from 'tsup'

export default defineConfig({
  // Expose multiple top-level entry points so downstream apps can
  // consume implementations and receive type definitions cleanly.
  entry: {
    index: 'src/index.ts',
    'sdk/index': 'src/sdk/index.ts',
    'nextjs/index': 'src/nextjs/index.ts',
    'providers/stripe/StripeAdapter': 'src/providers/stripe/StripeAdapter.ts',
    'storage/drizzle': 'src/storage/drizzle.ts',
    'storage/inMemory': 'src/storage/inMemory.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  outDir: 'dist',
  target: 'node16',
  platform: 'node',
  // Keep dependencies external for library consumption
  skipNodeModulesBundle: true,
})