const path = require('node:path');
const esbuild = require(process.env.DEADZONE_ESBUILD || 'esbuild');

const root = path.resolve(__dirname, '..', '..');
esbuild.build({
  entryPoints: [path.join(__dirname, 'main.tsx')],
  outbase: __dirname,
  outdir: path.join(root, 'games', 'deadzone'),
  entryNames: 'game',
  bundle: true,
  minify: true,
  platform: 'browser',
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  nodePaths: process.env.DEADZONE_NODE_MODULES ? [process.env.DEADZONE_NODE_MODULES] : [],
  logLevel: 'info'
}).catch(() => process.exitCode = 1);
