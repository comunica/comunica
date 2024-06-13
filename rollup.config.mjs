// The following is only possible from Node 18 onwards
import sharedConfig from '@inrupt/base-rollup-config';

// eslint-disable-next-line import/extensions
import pkg from './package.json' assert { type: 'json' };

export default sharedConfig(pkg);
