# Comunica Query Init Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-query.svg)](https://www.npmjs.com/package/@comunica/actor-init-query)

An [Init](https://github.com/comunica/comunica/tree/master/packages/bus-init) actor that can initialize a query engine.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-init-query
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-init-query/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:init/actors#query",
      "@type": "ActorInitQuery",
      "mediatorQueryProcess": { "@id": "urn:comunica:default:query-process/mediators#main" },
      "mediatorQueryResultSerialize": { "@id": "urn:comunica:default:query-result-serialize/mediators#serialize" },
      "mediatorQueryResultSerializeMediaTypeCombiner": { "@id": "urn:comunica:default:query-result-serialize/mediators#mediaType" },
      "mediatorQueryResultSerializeMediaTypeFormatCombiner": { "@id": "urn:comunica:default:query-result-serialize/mediators#mediaTypeFormat" },
      "mediatorHttpInvalidate": { "@id": "urn:comunica:default:http-invalidate/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorSparqlSerialize`: A mediator over the [query result serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-result-serialize).
* `mediatorSparqlSerializeMediaTypeCombiner`: A mediator over the [query result serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-result-serialize).
* `mediatorSparqlSerializeMediaTypeFormatCombiner`: A mediator over the [query result serialize bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-result-serialize).
* `mediatorHttpInvalidate`: A mediator over the [HTTP invalidate bus](https://github.com/comunica/comunica/tree/master/packages/bus-http-invalidate).
