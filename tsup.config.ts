import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'providers/stripe': 'src/providers/stripe.ts',
    'providers/paypal': 'src/providers/paypal.ts',
    'providers/crypto': 'src/providers/crypto.ts',
    'providers/mock': 'src/providers/mock.ts',
    types: 'src/types.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  treeshake: true,
  clean: true,
  minify: false,
  target: 'es2020',
  outDir: 'dist',
  splitting: false,
  shims: false,
  // Keep peer/optional deps external to avoid bundling SDKs
  external: ['stripe', 'eventemitter3'],
});