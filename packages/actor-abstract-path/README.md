# Comunica Abstract Path Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-abstract-path.svg)](https://www.npmjs.com/package/@comunica/actor-abstract-path)

An abstract [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
that handles [SPARQL property path](https://www.w3.org/TR/sparql11-query/#propertypaths) operations.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-abstract-path
```

## Usage

This package exposes [`ActorAbstractPath`](https://comunica.github.io/comunica/classes/_comunica_actor_abstract_path.ActorAbstractPath.html)
that provides utility methods for actors that implement property path operations.
