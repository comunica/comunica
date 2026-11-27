#!/usr/bin/env node

import { approveStagedCli } from '../lib/approveStaged';

approveStagedCli(process.argv.slice(2), process.cwd()).then((success) => {
  process.exitCode = success ? 0 : 1;
}, (error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
