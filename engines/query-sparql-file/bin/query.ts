#!/usr/bin/env node

import { runArgsInProcessStatic } from '@comunica/runner-cli';

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires
runArgsInProcessStatic(require('../engine-default.cjs')());
