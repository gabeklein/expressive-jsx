import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['cjs', 'esm'],
  outDir: 'dist',
  clean: true,
  splitting: false,
  shims: false,
  minify: false,
  target: 'node16',
});
