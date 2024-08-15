const path = require('node:path');
const webpack = require('webpack');

module.exports = {
  entry: [ path.resolve(__dirname, 'lib/index-browser.js') ],
  output: {
    filename: 'comunica-browser.js',
    path: __dirname,
    libraryTarget: 'var',
    library: 'Comunica',
  },
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/u,
        loader: 'babel-loader',
        exclude: /node_modules/u,
      },
    ],
  },
  plugins: [
    new webpack.ProgressPlugin(),
  ],
  performance: {
    hints: 'error',
    maxAssetSize: 1750000,
    maxEntrypointSize: 1750000,
  },
};
