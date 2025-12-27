import { defineConfig } from 'tsdown';

export default defineConfig({
  platform: 'neutral',
  format: ['esm', 'cjs'],
  dts: true,
  minify: true,
  exports: true,
  skipNodeModulesBundle: true,
  entry: ['./src/index.ts', './src/functions/index.ts', './src/types/index.ts'],
  treeshake: true,
});
