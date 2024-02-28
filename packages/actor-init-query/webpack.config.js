const path = require('node:path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
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
  resolve: {
    fallback: {
      buffer: require.resolve('buffer/'),
    },
  },
  plugins: [
    new NodePolyfillPlugin({ includeAliases: [ 'Buffer' ]}),
    new webpack.ProgressPlugin(),
  ],
};
