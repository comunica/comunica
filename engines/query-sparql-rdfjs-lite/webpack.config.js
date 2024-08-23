const path = require('node:path');
const superConfig = require('@comunica/actor-init-query/webpack.config');

superConfig.entry = [ path.resolve(__dirname, 'lib/index-browser.js') ];
superConfig.output.path = __dirname;
superConfig.performance.maxAssetSize = 800000;
superConfig.performance.maxEntrypointSize = 800000;
module.exports = superConfig;
