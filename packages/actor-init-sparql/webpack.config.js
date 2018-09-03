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
      { // This fixes a problem where the setImmediate of asynciterator would conflict with webpack's polyfill
        test: /asynciterator\.js$/,
        loader: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /if \(typeof process !== 'undefined' && !process\.browser\)/i,
              replacement: function () {
                return 'if (true)';
              },
            },
          ] }),
      },
      {
        // Makes rdf-sink use a modularized lodash function instead of requiring lodash completely
        test: /rdf-sink\/index\.js$/,
        loader: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /lodash\/assign/i,
              replacement: function () {
                return 'lodash.assign';
              }
            }
          ]})
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
