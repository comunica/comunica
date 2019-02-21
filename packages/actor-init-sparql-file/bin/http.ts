#!/usr/bin/env node
import {HttpServiceSparqlEndpoint} from "@comunica/actor-init-sparql";
HttpServiceSparqlEndpoint.runArgsInProcess(__dirname + '/../', __dirname + '/../config/config-default.json');
