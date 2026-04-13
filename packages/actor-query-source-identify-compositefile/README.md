# Comunica Composite File Query Source Identify Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-identify-compositefile.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-identify-compositefile)

A [Query Source Identify](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify) actor that handles composite file sources.

This actor enables querying over multiple file URLs as a single combined source, such as:
```js
{ sources: [{ type: 'compositefile', value: [ 'https://example.org/file1.ttl', 'https://example.org/file2.ttl' ] }] }
```

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-identify-compositefile
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-identify-compositefile/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-identify/actors#compositefile",
      "@type": "ActorQuerySourceIdentifyCompositeFile",
      "mediatorQuerySourceIdentify": { "@id": "urn:comunica:default:query-source-identify/mediators#main" },
      "mediatorMergeBindingsContext": { "@id": "urn:comunica:default:merge-bindings-context/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorQuerySourceIdentify`: A mediator over the [Query Source Identify bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify).
* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
