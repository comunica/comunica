#!/usr/bin/env node

// eslint-disable-next-line import/no-nodejs-modules
import { readFileSync } from 'node:fs';
import { measureBundleSizes, renderBundleSizeComment } from '../lib/bundleSizes';

const USAGE = `Usage:
  bundle-sizes measure <monorepo dir>
  bundle-sizes compare <head JSON> <base JSON> <head sha> <base sha> <CI run URL> <history URL>
`;

const [ command, ...args ] = process.argv.slice(2);
if (command === 'measure' && args.length === 1) {
  process.stdout.write(`${JSON.stringify(measureBundleSizes(args[0]), null, 2)}\n`);
} else if (command === 'compare' && args.length === 6) {
  const [ headFile, baseFile, headSha, baseSha, runUrl, historyUrl ] = args;
  process.stdout.write(renderBundleSizeComment(
    JSON.parse(readFileSync(headFile, 'utf8')),
    JSON.parse(readFileSync(baseFile, 'utf8')),
    { headSha, baseSha, runUrl, historyUrl },
  ));
} else {
  process.stderr.write(USAGE);
  process.exit(1);
}
