const path = require('node:path');
const superConfig = require('@comunica/actor-init-query/webpack.config');

superConfig.entry = [ path.resolve(__dirname, 'lib/index-browser.js') ];
superConfig.output.path = __dirname;
superConfig.performance.maxAssetSize = 750000;
superConfig.performance.maxEntrypointSize = 750000;
module.exports = superConfig;
