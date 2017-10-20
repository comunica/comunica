#!/usr/bin/env node

import {Setup} from "@comunica/runner";
import {IActorOutputInit} from "../../bus-init/lib/ActorInit";

const argv = process.argv.slice(2);
if (argv.length < 1 || /^--?h(elp)?$/.test(argv[0])) {
  console.log('usage: runner-cli config.json [args...]');
  process.exit(1);
}

const configResourceUrl = argv.shift();
Setup.run(configResourceUrl, { argv, env: process.env, stdin: process.stdin })
  .then((results: IActorOutputInit[]) => {
    results.forEach((result: IActorOutputInit) => {
      result.stdout.pipe(process.stdout);
      result.stderr.pipe(process.stderr);
    });
  })
  .catch(console.error);
