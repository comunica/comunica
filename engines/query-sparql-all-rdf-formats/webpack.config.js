const path = require('path');
const superConfig = require('@comunica/actor-init-query/webpack.config');
superConfig.entry = [ path.resolve(__dirname, 'lib/index-default.js') ];
superConfig.output.path = __dirname;
module.exports = superConfig;
