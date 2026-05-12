import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Configuration, rspack } from '@rspack/core';

const here = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const pkg = require('./package.json') as { version: string };

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
  plugins: [
    new rspack.DefinePlugin({ VERSION: JSON.stringify(pkg.version) }),
    new rspack.BannerPlugin({ banner: '#!/usr/bin/env node', raw: true, entryOnly: true }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: { compress: true, mangle: true, format: { comments: false } },
      }),
    ],
  },
};

const libConfig: Configuration = {
  ...cliConfig,
  entry: { index: './src/index.ts' },
  output: { ...cliConfig.output, filename: '[name].js' },
  plugins: [new rspack.DefinePlugin({ VERSION: JSON.stringify(pkg.version) })],
};

export default [cliConfig, libConfig];
