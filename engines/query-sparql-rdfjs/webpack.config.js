const path = require('path');
const superConfig = require('@comunica/actor-init-query/webpack.config');
superConfig.entry = [ '@babel/polyfill', path.resolve(__dirname, 'lib/index-browser.js') ];
superConfig.output.path = __dirname;
module.exports = superConfig;
