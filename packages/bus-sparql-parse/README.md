# Comunica Bus SPARQL Parse

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-sparql-parse.svg)](https://www.npmjs.com/package/@comunica/bus-sparql-parse)

A bus for parsing an input query into SPARQL algebra.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-sparql-parse
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-sparql-parse/^1.0.0/components/context.jsonld"`
* **Bus name**: `cbsp:Bus/SparqlParse`

## Creating actors on this bus

Actors extending [`ActorSparqlParse`](https://comunica.github.io/comunica/classes/bus_sparql_parse.actorsparqlparse-1.html) are automatically subscribed to this bus.

