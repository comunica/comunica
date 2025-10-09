# Comunica Algebra

[![npm version](https://badge.fury.io/js/%40comunica%2Futils-algebra.svg)](https://www.npmjs.com/package/@comunica/utils-algebra)

Exposes the algebra used by Comunica.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/utils-data-factory
```

## Exposed

* `Algebra`: Collection of algebra related types and transformers.
* `AlgebraFactory`: A factory to create the algebra operations.
* `algebraUtils`: a collection of utility functions for the algebra

## Additional info

The algebra is derived from the algebra exposed by [Traqula](https://github.com/comunica/traqula), to contain the same operations but using interface instead of type unions.
The usage of interfaces creates an environment where it is easy for third parties to extend Comunica to run on algebra operations that are unknown to base Comunica.

Base Comunica function on an open interface `Operation`/`BaseOperation` that just describes an object with a string `type`. Whenever a type matches with a known types, the actors may conclude that the object will at least match the properties described by this algebra package.
To help in this feat, the algebra exposes 3 type guards: `isKnownOperation`, `isKnownOperationSub`, and `isKnownSub` that will help you validate what Operations your actor receives.
Actors should always be implemented in a way that matches this philosophy of open algebra types.

Additionally, allowing Comunica to declare for itself what it views as _'valid algebra'_ allows for more independent evolution of comunica in relation to the (algebra) parser it uses.
