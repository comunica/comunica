import { createConfig } from '@comunica/actor-init-query/webpack.config.ts';

const liteConfig = createConfig(import.meta.dirname);

if (typeof liteConfig.performance === 'object') {
  liteConfig.performance.maxAssetSize = 915_000;
  liteConfig.performance.maxEntrypointSize = 915_000;
}

export default liteConfig;
