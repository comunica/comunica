# Comunica Optional OptPlus Loop RDF Join Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-optional-optplus.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-optional-optplus)

An [RDF Join](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) actor that handles ["OPT+: A Monotonic Alternative to OPTIONAL in SPARQL" (by Sijin Cheng and Olaf Hartig)](https://www.researchgate.net/publication/333627321_OPT_A_Monotonic_Alternativeto_OPTIONAL_in_SPARQL) operations
by delegating back to the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join) bus.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-optional-optplus
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-optional-optplus/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join/actors#optional-optplus",
      "@type": "ActorRdfJoinOptionalOptPlus",
      "mediatorJoin": { "@id": "urn:comunica:default:rdf-join/mediators#main" },
      "mediatorJoinSelectivity": { "@id": "urn:comunica:default:rdf-join-selectivity/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorJoinSelectivity`: A mediator over the [RDF Join Selectivity bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-selectivity).
* `mediatorJoin`: A mediator over the [RDF Join bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join).
