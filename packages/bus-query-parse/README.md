# Comunica Bus Query Parse

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-query-parse.svg)](https://www.npmjs.com/package/@comunica/bus-query-parse)

A bus for parsing an input query into SPARQL algebra.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-query-parse
```

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-query-parse/^2.0.0/components/context.jsonld"`
* **Bus name**: `ActorQueryParse:_default_bus`

## Creating actors on this bus

Actors extending [`ActorQueryParse`](https://comunica.github.io/comunica/classes/_comunica_bus_query_parse.ActorQueryParse.html) are automatically subscribed to this bus.

