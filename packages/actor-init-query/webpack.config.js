import { resolve } from 'node:path';
import webpack from 'webpack';

function createConfig(packagePath) {
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
    performance: {
      hints: 'error',
      // Bundle size limited to ~1.7 MB
      maxAssetSize: 2_000_000,
      maxEntrypointSize: 2_000_000,
    },
    plugins: [
      new webpack.ProgressPlugin(),
    ],
  };
}

export { createConfig };
