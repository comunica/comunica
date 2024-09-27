import { createConfig } from '../../webpack.config';

const liteConfig = createConfig(__dirname);

if (typeof liteConfig.performance === 'object') {
  liteConfig.performance.maxAssetSize = 750000;
  liteConfig.performance.maxEntrypointSize = 750000;
}

export default liteConfig;
