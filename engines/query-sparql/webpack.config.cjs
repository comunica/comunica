const path = require('node:path');
const superConfig = require('@comunica/actor-init-query/webpack.config.cjs');

superConfig.entry = [ path.resolve(__dirname, 'lib/index-browser.cjs') ];
superConfig.output.path = __dirname;
module.exports = superConfig;
