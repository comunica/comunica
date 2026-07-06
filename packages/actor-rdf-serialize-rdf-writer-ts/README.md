# Comunica rdf-writer.ts RDF Serialize Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-serialize-rdf-writer-ts.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-serialize-rdf-writer-ts)

An [RDF Serialize](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-serialize) actor that handles
Turtle, TriG, N-Quads, and N-Triples using [rdf-writer.ts](https://www.npmjs.com/package/rdf-writer-ts).

This actor does not handle N3 rules/formulas. Use `@comunica/actor-rdf-serialize-n3` when `text/n3` support is required.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-serialize-rdf-writer-ts
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-serialize-rdf-writer-ts/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-serialize/actors#rdf-writer-ts",
      "@type": "ActorRdfSerializeRdfWriterTs",
      "priorityScale": 1.0
    }
  ]
}
```

It can be configured next to `@comunica/actor-rdf-serialize-n3`; content negotiation priorities decide which actor is selected for overlapping RDF media types.

### Config Parameters

* `priorityScale`: An optional priority for this serializer, used for content negotiation, defaults to `1`.
