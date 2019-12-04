# Comunica Quadpattern Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-quadpattern.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-quadpattern)

A comunica actor for handling 'quadpattern' query operations.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-query-operation-quadpattern
```

## Usage

TODO

### Quad-pattern-level context

Optionally, quad pattern operations may have a `context` field
that is of type `ActionContext`.
If such a quad-pattern-level context is detected,
it will be merged with the actor operation context.

This feature is useful if you want to attach specific flags
to quad patterns within the query plan,
such as the source(s) it should query over.
