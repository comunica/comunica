#!/usr/bin/env node

import { stageReleaseCli } from '../lib/stageRelease';

stageReleaseCli(process.argv.slice(2), process.cwd()).then((success) => {
  process.exitCode = success ? 0 : 1;
}, (error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
