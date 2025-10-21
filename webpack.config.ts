import { resolve } from 'node:path';
import { ProgressPlugin } from 'webpack';
import type { Configuration } from 'webpack';

function createConfig(packagePath: string): Configuration {
  return {
    devtool: 'source-map',
    entry: resolve(packagePath, 'lib', 'index-browser.ts'),
    mode: 'development',
    module: {
      rules: [
        {
          test: /\.ts$/u,
          loader: 'ts-loader',
          exclude: /node_modules/u,
        },
      ],
    },
    output: {
      filename: 'comunica-browser.js',
      path: packagePath,
      libraryTarget: 'var',
      library: 'Comunica',
    },
    plugins: [
      new ProgressPlugin(),
    ],
    performance: {
      hints: 'error',
      // Bundle size limited to ~2.2 MB
      maxAssetSize: 2_250_000,
      maxEntrypointSize: 2_250_000,
    },
  };
}

export { createConfig };
