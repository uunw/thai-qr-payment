import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Configuration, rspack } from '@rspack/core';

const here = fileURLToPath(new URL('.', import.meta.url));

const libConfig = (format: 'esm' | 'cjs'): Configuration => ({
  mode: 'production',
  target: ['web', 'es2022'],
  entry: {
    index: './src/index.ts',
    payload: './src/payload.ts',
    qr: './src/qr.ts',
    render: './src/render.ts',
    assets: './src/assets.ts',
  },
  externalsType: format === 'esm' ? 'module' : 'commonjs',
  externals: [/^@thai-qr-payment\//],
  output: {
    path: resolve(here, 'dist'),
    filename: format === 'esm' ? '[name].js' : '[name].cjs',
    library: { type: format === 'esm' ? 'module' : 'commonjs2' },
    clean: false,
    module: format === 'esm',
    chunkFormat: format === 'esm' ? 'module' : 'commonjs',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
          module: { type: format === 'esm' ? 'es6' : 'commonjs' },
        },
        type: 'javascript/auto',
      },
    ],
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: false,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: { compress: { passes: 2 }, mangle: true, format: { comments: false } },
      }),
    ],
  },
  performance: { hints: false },
});

const cliConfig: Configuration = {
  mode: 'production',
  target: 'node18',
  entry: { cli: './src/cli.ts' },
  output: {
    path: resolve(here, 'dist'),
    filename: '[name].js',
    library: { type: 'module' },
    module: true,
    chunkFormat: 'module',
    clean: false,
  },
  externalsType: 'module',
  externals: [/^node:/, /^@thai-qr-payment\//],
  resolve: {
    extensions: ['.ts', '.js'],
    extensionAlias: { '.js': ['.ts', '.js'] },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
          module: { type: 'es6' },
        },
        type: 'javascript/auto',
      },
    ],
  },
  plugins: [new rspack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true, entryOnly: true })],
  optimization: {
    minimize: true,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: { compress: true, mangle: true, format: { comments: false } },
      }),
    ],
  },
};

export default [libConfig('esm'), libConfig('cjs'), cliConfig];
