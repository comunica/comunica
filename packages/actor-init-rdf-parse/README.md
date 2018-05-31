# Comunica RDF Parse

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-rdf-parse.svg)](https://www.npmjs.com/package/@comunica/actor-init-rdf-parse)

An example init actor for Comunica that triggers an RDF Parse event for the given input stream.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-init-rdf-parse
```

This package exposes the binary `comunica-rdf-parse [mediatype]` that accepts a stream in any RDF syntax.

## Usage

The `config/config-example.json` contains an example on how to run this actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitRdfParse`,
the actor allows optional HTTP request parameters to be changed.

When executed, the actor will take the URL from the first CLI parameter,
combine it with the parameters from the config file,
perform the request, and print its response to stdout.

When `@comunica/runner-cli`, `@comunica/runner`
and any HTTP actor (such as `@comunica/actor-http-node-fetch`) are installed,
executing the following:

```
$ curl -H "Accept: application/trig" https://fragments.linkedsoftwaredependencies.org/npm | node bin/run.js application/trig
```

will print the response.
