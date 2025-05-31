const createConfig = require('@comunica/actor-init-query/webpack.config').createConfig;

const liteConfig = createConfig(__dirname);

if (typeof liteConfig.performance === 'object') {
  liteConfig.performance.maxAssetSize = 915_000;
  liteConfig.performance.maxEntrypointSize = 915_000;
}

export default liteConfig;
