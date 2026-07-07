#!/usr/bin/env node

import { testConfigCompat } from '../lib/testConfigCompat';

// eslint-disable-next-line ts/no-floating-promises
testConfigCompat(process.cwd());
