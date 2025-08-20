#!/usr/bin/env node
import { runArgsInProcess } from '@comunica/runner-cli';

// eslint-disable-next-line node/no-path-concat
runArgsInProcess(`${__dirname}/../`, `${__dirname}/../config/config-default.json`);
