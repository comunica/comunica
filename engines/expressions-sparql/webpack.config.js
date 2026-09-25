const createConfig = require('@comunica/actor-init-query/webpack.config.js');

const expressionsConfig = createConfig(__dirname);

if (typeof expressionsConfig.performance === 'object') {
  expressionsConfig.performance.maxAssetSize = 950_000;
  expressionsConfig.performance.maxEntrypointSize = 950_000;
}

module.exports = expressionsConfig;
