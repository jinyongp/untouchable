import esbuild, { type BuildOptions } from 'esbuild';

function build() {
  const options: BuildOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: true,
    outdir: 'dist',
    target: 'es6',
  };

  esbuild.build({
    ...options,
    format: 'esm',
    outExtension: { '.js': '.mjs' },
  });

  esbuild.build({
    ...options,
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
  });

  esbuild.build({
    ...options,
    format: 'iife',
    outExtension: { '.js': '.js' },
  });
}

build();
