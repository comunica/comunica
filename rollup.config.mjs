// The following is only possible from Node 18 onwards
import { createSharedConfig } from '@inrupt/base-rollup-config';
import typescript from "@rollup/plugin-typescript";

// eslint-disable-next-line import/extensions
import pkg from './package.json' assert { type: 'json' };
import config from './tsconfig.json' assert { type: 'json' };

// export const createSharedConfig = (pkg) => ({
//     plugins: [typescript({
//       compilerOptions: {
//         module: 'ESNext'
//       }
//     })],
//     external: [
//       ...Object.keys(pkg.dependencies || {}),
//       ...Object.keys(pkg.peerDependencies || {}),
//     ],
//     // The following option is useful because symlinks are used in monorepos
//     preserveSymlinks: true,
//   });

const { include } = config;

export default [
    {
        input: "./src/index.ts",
    output: [
    //   {
    //     file: pkg.module,
    //     format: "esm",
    //     sourcemap: true,
    //     plugins: [
    //         typescript({
    //             compilerOptions: {
    //                 module: 'ESNext',
    //             },
    //             include: include.filter((path) => !path.includes("bin")),
    //             exclude: [ ...config.exclude, "packages/*/bin/**/*" ]
    //         })
    //     ]
    //   },
      {
        file: pkg.main,
        format: "cjs",
        sourcemap: true,
      },
    ],
    ...createSharedConfig(pkg),
  },
];
  


// const config = sharedConfig(pkg);

// export default sharedConfig(pkg);
