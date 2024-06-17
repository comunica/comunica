import { createSharedConfig } from '@inrupt/base-rollup-config';

// eslint-disable-next-line import/extensions
import pkg from './package.json' assert { type: 'json' };

export default [
  {
    ...createSharedConfig(pkg),
    input: './lib/index.ts',
    output: [
      {
        dir: './lib',
        format: 'cjs',
        sourcemap: true,
        preserveModules: true,
      },
      {
        file: pkg.module,
        format: 'esm',
        sourcemap: true,
      },
    ],
  },
];
