const path = require('path');
const webpack = require('webpack');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
  entry: [ path.resolve(__dirname, 'lib/index-browser.js') ],
  output: {
    filename: 'comunica-browser.js',
    path: __dirname,
    libraryTarget: 'var',
    library: 'Comunica'
  },
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
    ]
  },
  resolve: {
    fallback: {
      buffer: require.resolve("buffer/"),
    }
  },
  plugins: [
    new NodePolyfillPlugin({ includeAliases: ['Buffer'] }),
    new webpack.ProgressPlugin()
  ]
};
