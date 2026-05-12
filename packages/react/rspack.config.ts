import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Configuration, rspack } from '@rspack/core';

const here = fileURLToPath(new URL('.', import.meta.url));

const baseConfig = (format: 'esm' | 'cjs'): Configuration => ({
  mode: 'production',
  target: ['web', 'es2022'],
  entry: { index: './src/index.tsx' },
  externalsType: format === 'esm' ? 'module' : 'commonjs',
  externals: [/^react/, /^@thai-qr-payment\//],
  output: {
    path: resolve(here, 'dist'),
    filename: format === 'esm' ? '[name].js' : '[name].cjs',
    library: { type: format === 'esm' ? 'module' : 'commonjs2' },
    clean: false,
    module: format === 'esm',
    chunkFormat: format === 'esm' ? 'module' : 'commonjs',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    extensionAlias: { '.js': ['.tsx', '.ts', '.js'] },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', tsx: true },
            transform: { react: { runtime: 'automatic' } },
            target: 'es2022',
          },
          module: { type: format === 'esm' ? 'es6' : 'commonjs' },
        },
        type: 'javascript/auto',
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: { compress: { passes: 2 }, mangle: true, format: { comments: false } },
      }),
    ],
  },
  performance: { hints: false },
});

export default [baseConfig('esm'), baseConfig('cjs')];
