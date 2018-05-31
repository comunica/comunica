#!/usr/bin/env node

import {IActorOutputInit} from "../../bus-init/lib/ActorInit";
// tslint:disable:no-var-requires
const sparqlActor: any = require('../engine-default.js');

const argv = process.argv.slice(2);
sparqlActor.run({ argv, env: process.env, stdin: process.stdin })
  .then((result: IActorOutputInit) => {
    if (result.stdout) {
      result.stdout.on('error', console.error);
      result.stdout.pipe(process.stdout);
    }
    if (result.stderr) {
      result.stderr.on('error', console.error);
      result.stderr.pipe(process.stderr);
    }
  }).catch(console.error);
