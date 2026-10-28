# Comunica Optional Index Nested Loop RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-optional-index-nested-loop.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-optional-index-nested-loop)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that optionally joins 2 streams
as an index nested loop join.

Bound patterns are passed to their source directly
if they can look up quad patterns synchronously (`IQuerySource#queryBindingsSynchronous`).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-optional-index-nested-loop
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-optional-index-nested-loop/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#optional-index-nested-loop",
      "@type": "ActorRdfJoinOptionalIndexNestedLoop",
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `selectivityModifier`: Multiplier for selectivity values, which defaults to half the one of the optional bind join, so that this actor is preferred where both apply. _(defaults to `0.0000005`)_
