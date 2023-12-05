# Comunica Data Factory

[![npm version](https://badge.fury.io/js/%40comunica%2Fdata-factory.svg)](https://www.npmjs.com/package/@comunica/data-factory)

[RDFJS DataFactory](http://rdf.js.org/data-model-spec/) utilities.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/data-factory
```

## Exposed classes

* [`BlankNodeScoped`](https://comunica.github.io/comunica/classes/_comunica_data_factory.BlankNodeScoped.html): A blank node that is scoped to a certain source, and exposes a skolemized named node.
* [`BlankNodeBindingsScoped`](https://comunica.github.io/comunica/classes/_comunica_data_factory.BlankNodeBindingsScoped.html): A blank node that is scoped to a certain set of bindings.
