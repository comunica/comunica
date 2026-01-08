const path = require('node:path');
const webpack = require('webpack');

module.exports = function createConfig(packagePath) {
  return {
    devtool: 'source-map',
    entry: path.resolve(packagePath, 'lib', 'index-browser.ts'),
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
      // Bundle size limited to ~2.3 MB
      maxAssetSize: 2_400_000,
      maxEntrypointSize: 2_400_000,
    },
    plugins: [
      new webpack.ProgressPlugin(),
    ],
  };
};
