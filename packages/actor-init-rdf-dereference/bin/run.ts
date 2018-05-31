#!/usr/bin/env node
import {runArgsInProcess} from "@comunica/runner-cli";
runArgsInProcess(__dirname + '/../', __dirname + '/../config/config-example.json');
