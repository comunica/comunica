#!/usr/bin/env node
import { KeysInitQuery } from '@comunica/context-entries';
import { runArgsInProcessStatic } from '@comunica/runner-cli';
import { ActionContext } from '@comunica/core';
import { CliArgsHandlerRemoteCache } from '../lib/CliArgsHandlerRemoteCache';

const cliArgsHandlerRemoteCache = new CliArgsHandlerRemoteCache();

// eslint-disable-next-line ts/no-require-imports,ts/no-var-requires,import/extensions
runArgsInProcessStatic(require('../engine-default.js')(), {
  context: new ActionContext({
    [KeysInitQuery.cliArgsHandlers.name]: [ cliArgsHandlerRemoteCache ],
  })
});
