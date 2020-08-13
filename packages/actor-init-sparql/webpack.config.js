const path = require('path');
const ProgressPlugin = require('webpack').ProgressPlugin;

module.exports = {
  entry: [ path.resolve(__dirname, 'index-browser.js') ],
  output: {
    filename: 'comunica-browser.js',
    path: __dirname,
    libraryTarget: 'var',
    library: 'Comunica'
  },
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
  plugins: [
    new ProgressPlugin(),
  ]
};
