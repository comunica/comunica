import { createConfig } from '../../webpack.config';

const liteConfig = createConfig(__dirname);

if (typeof liteConfig.performance === 'object') {
  liteConfig.performance.maxAssetSize = 910_000;
  liteConfig.performance.maxEntrypointSize = 910_000;
}

export default liteConfig;
