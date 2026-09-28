#!/usr/bin/env node

import { readmeCheck } from '../lib/readmeCheck';

const failures = readmeCheck(process.cwd());
if (failures.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`README check failures:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
}
