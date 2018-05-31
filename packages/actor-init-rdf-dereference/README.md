# Comunica RDF Dereference

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-rdf-dereference.svg)](https://www.npmjs.com/package/@comunica/actor-init-rdf-dereference)

An example init actor for Comunica that triggers an RDF Dereference event for the given URL.
In practise, this will fetch an HTTP resource, and parse its RDF contents.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-init-rdf-dereference
```

This package exposes the binary `comunica-rdf-dereference [url]`.

## Usage

The `config/config-example.json` contains an example on how to run this actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitRdfDereference`,
the actor allows optional URL parameters to be changed.

When executed, the actor will take the URL from the first CLI parameter,
or take it from the config file if not available,
perform the request, and print its response to stdout.

Executing the following:

```
$ node bin/run.js https://fragments.linkedsoftwaredependencies.org/npm
```

will print the response.
