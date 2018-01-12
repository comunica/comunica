const path = require('path');
const webpack = require('webpack');
const StringReplacePlugin = require("string-replace-webpack-plugin");

module.exports = {
  entry: {
    path: path.resolve(__dirname, 'dist/engine-default.js')
  },
  output: {
    filename: 'comunica-browser.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'var',
    library: 'Comunica'
  },
  devtool: 'cheap-module-source-map',
  module: {
    loaders: [
      { // This fixes an issue where UglifyJS would fail because labeled declarations are not allowed in strict mode
        // This is a problem that should be fixed in jison: https://github.com/zaach/jison/issues/351
        test: /SparqlParser\.js$/,
        loader: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /_token_stack:/i,
              replacement: function () {
                return '';
              }
            }
          ]})
      },
      {
        test: /\.js$/,
        loader: 'babel-loader?presets[]=es2015'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    }),
    new StringReplacePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        screw_ie8: true,
        conditionals: true,
        unused: true,
        comparisons: true,
        sequences: true,
        dead_code: true,
        evaluate: true,
        if_return: true,
        join_vars: true
      },
      output: {
        comments: false
      }
    }),
    new webpack.HashedModuleIdsPlugin()
  ]
};
