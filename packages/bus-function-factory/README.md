# Comunica Bus Function Factory

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-function-factory.svg)](https://www.npmjs.com/package/@comunica/bus-function-factory)

A comunica bus for function factory events.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-function-factory
```

## Usage

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-function-factory/^1.0.0/components/context.jsonld"`
* **Bus name**: `ActorFunctionFactory:_default_bus`

When a mediator is required, the argument should get the `MediatorFunctionFactoryUnsafe` and manually cast it to `MediatorFunctionFactory`.
We require this work around because Components.js does not support the complex type of MediatorFunctions.

## Creating actors on this bus

Actors extending [`ActorFunctionFactory`](TODO:jsdoc_url) are automatically subscribed to this bus.
