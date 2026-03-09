import { build } from 'esbuild';

await build({
  entryPoints: ['src/vercel.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/vercel.cjs',
  external: [],
  minify: true,
  sourcemap: false,
});

console.log('✅ API bundled for Vercel');
