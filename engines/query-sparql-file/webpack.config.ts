import { createConfig } from '@comunica/actor-init-query/webpack.config.ts';

export default createConfig(globalThis.__dirname ?? import.meta.dirname);
