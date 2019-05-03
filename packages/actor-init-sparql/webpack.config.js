const path = require('path');
const StringReplacePlugin = require("string-replace-webpack-plugin");
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
  entry: [ '@babel/polyfill', path.resolve(__dirname, 'index-browser.js') ],
  output: {
    filename: 'comunica-browser.js',
    path: __dirname,
    libraryTarget: 'var',
    library: 'Comunica'
  },
  devtool: 'cheap-module-source-map',
  module: {
    rules: [
      {
        // This is needed because our internal graphql dependency uses .mjs files,
        // and Webpack's define plugin doesn't work well with it (yet).
        // In the future this should be removed.
        type: 'javascript/auto',
        test: /\.mjs$/,
        use: []
      },
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              require('@babel/plugin-transform-async-to-generator'),
              require('@babel/plugin-syntax-object-rest-spread')
            ]
          }
        }
      }
    ]
  },
  optimization: {
    minimizer: [
      // we specify a custom UglifyJsPlugin here to get source maps in production
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        uglifyOptions: {
          compress: false,
          mangle: true,
        },
        sourceMap: true
      })
    ]
  },
  plugins: [
    new StringReplacePlugin(),
  ]
};
