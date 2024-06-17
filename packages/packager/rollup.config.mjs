import { createSharedConfig } from "@inrupt/base-rollup-config";
// eslint-disable-next-line import/extensions
import pkg from "./package.json" assert { type: "json" };

export default [
  {
    ...createSharedConfig(pkg),
    input: "./bin/package.ts",
    output: [
      {
        dir: "./bin",
        format: "cjs",
        sourcemap: true,
        preserveModules: true,
      },
    ],
  },
];
