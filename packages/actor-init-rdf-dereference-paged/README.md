# Comunica RDF Dereference Paged

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-rdf-dereference-paged.svg)](https://www.npmjs.com/package/@comunica/actor-init-rdf-dereference-paged)

An example init actor for Comunica that triggers an RDF Dereference Paged event for the given URL.
In practise, this will fetch an HTTP resource, parse its RDF contents, and follow nextPage links.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-init-rdf-dereference-paged
```

This package exposes the binary `comunica-rdf-dereference-paged [url]`.

## Usage

The `config/config-example.json` contains an example on how to run this actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitRdfDereferencePaged`,
the actor allows optional URL parameters to be changed.

When executed, the actor will take the URL from the first CLI parameter,
or take it from the config file if not available,
perform the request, and print its response to stdout.

Executing the following:

```
$ node bin/run.js https://fragments.linkedsoftwaredependencies.org/npm
```

will print the response.
