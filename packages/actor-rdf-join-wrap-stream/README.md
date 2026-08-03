# Comunica Wrap Stream RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-wrap-stream.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-wrap-stream)

A comunica Wrap Stream RDF Join Actor. This actor calls the `bus-iterator-transform` for all iterators produced by `query-operation` actors.
This actor should only be included if you require the functionality of `bus-iterator-transform` as it may slow down query execution.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-wrap-stream
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-wrap-stream/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#wrap-stream",
      "@type": "ActorRdfJoinWrapStream"
    }
  ]
}
```

### Config Parameters
* `mediatorIteratorTransform`: Mediator that will run all actors subscribed to the `bus-iterator-transform` in sequence.
* `mediatorJoin`: Mediator that runs the join operation that will be wrapped.
