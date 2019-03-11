#!/usr/bin/env node
import {HttpServiceSparqlEndpoint} from "../lib/HttpServiceSparqlEndpoint";
HttpServiceSparqlEndpoint.runArgsInProcess(__dirname + '/../', __dirname + '/../config/config-default.json');
