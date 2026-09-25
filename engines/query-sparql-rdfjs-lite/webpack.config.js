const createConfig = require('@comunica/actor-init-query/webpack.config.js');

const liteConfig = createConfig(__dirname);

if (typeof liteConfig.performance === 'object') {
  liteConfig.performance.maxAssetSize = 1_200_000;
  liteConfig.performance.maxEntrypointSize = 1_200_000;
}

module.exports = liteConfig;
