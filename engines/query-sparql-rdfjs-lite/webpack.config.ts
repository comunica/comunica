import { createConfig } from '../../webpack.config';

const liteConfig = createConfig(__dirname);

if (typeof liteConfig.performance === 'object') {
  liteConfig.performance.maxAssetSize = 1_190_000;
  liteConfig.performance.maxEntrypointSize = 1_190_000;
}

export default liteConfig;
