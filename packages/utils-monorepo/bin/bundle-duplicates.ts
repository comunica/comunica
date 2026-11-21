#!/usr/bin/env node

import { checkBundleDuplicates } from '../lib/bundleDuplicates';

const USAGE = `Usage:
  bundle-duplicates <monorepo dir> [--allow <package name>]...

Fails if a browser bundle includes multiple copies of a package that is not allowed to be duplicated.
`;

const [ monorepoPath, ...options ] = process.argv.slice(2);
const allowed: string[] = [];
let valid = monorepoPath !== undefined && !monorepoPath.startsWith('--');
for (let i = 0; valid && i < options.length; i += 2) {
  valid = options[i] === '--allow' && options[i + 1] !== undefined;
  allowed.push(options[i + 1]);
}
if (valid) {
  const { report, failed } = checkBundleDuplicates(monorepoPath, allowed);
  (failed ? process.stderr : process.stdout).write(report);
  process.exitCode = failed ? 1 : 0;
} else {
  process.stderr.write(USAGE);
  process.exitCode = 1;
}
