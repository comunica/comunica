#!/usr/bin/env node

import { runArgsInProcessStatic } from '@comunica/runner-cli';

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires,import/extensions
runArgsInProcessStatic(require('../engine-default.js'));
