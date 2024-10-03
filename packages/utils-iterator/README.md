# Comunica Iterator Utils

[![npm version](https://badge.fury.io/js/%40comunica%2Futils-iterator.svg)](https://www.npmjs.com/package/@comunica/utils-iterator)

Utilities related to [AsyncIterator](https://github.com/RubenVerborgh/AsyncIterator/).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/utils-iterator
```

## Exposed utilities

* [`ChunkedIterator`](https://comunica.github.io/comunica/classes/_comunica_utils_iterator.ChunkedIterator.html): Splits an iterator into chunks based on a given block size.
* [`ClosableIterator`](https://comunica.github.io/comunica/classes/_comunica_utils_iterator.ClosableIterator.html): An AsyncIterator with a callback for when this iterator is closed in any way. In contrast to ClosableTransformIterator, this does not add the overhead of a TransformIterator.
* [`ClosableTransformIterator`](https://comunica.github.io/comunica/classes/_comunica_utils_iterator.ClosableTransformIterator.html): A TransformIterator with a callback for when this iterator is closed in any way.
* [`instrumentIterator`](https://comunica.github.io/comunica/classes/_comunica_utils_iterator.instrumentIterator.html): Profile an iterator by monkey-patching its `_read` and `read` methods.
