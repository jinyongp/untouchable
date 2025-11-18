import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],

  tsconfig: './tsconfig.json',

  dts: {
    build: true,
  },

  minify: true,
  shims: true,
  clean: true,

  format: ['esm', 'cjs'],
})
