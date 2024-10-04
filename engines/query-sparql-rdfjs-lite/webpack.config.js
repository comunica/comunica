const path = require('node:path');
const superConfig = require('@comunica/actor-init-query/webpack.config');

superConfig.entry = [ path.resolve(__dirname, 'lib/index-browser.js') ];
superConfig.output.path = __dirname;
superConfig.performance.maxAssetSize = 900000;
superConfig.performance.maxEntrypointSize = 900000;
module.exports = superConfig;
