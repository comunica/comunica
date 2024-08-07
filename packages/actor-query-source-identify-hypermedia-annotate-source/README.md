# Comunica Annotate Source Query Source Identify Hypermedia Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-source-identify-hypermedia-annotate-source.svg)](https://www.npmjs.com/package/@comunica/actor-query-source-identify-hypermedia-annotate-source)

A comunica Annotate Source Query Source Identify Hypermedia Actor. This actor wraps around other hypermedia sources and adds the
URL from which the bindings are derived to the binding's context.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-source-identify-hypermedia-annotate-source
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-source-identify-hypermedia-annotate-source/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-source-identify-hypermedia/actors#annotate-source",
      "@type": "ActorQuerySourceIdentifyHypermediaAnnotateSource"
    }
  ]
}
```

### Config Parameters

* `mediatorMergeBindingsContext`: A mediator over the [Merge Bindings Context bus](https://github.com/comunica/comunica/tree/master/packages/bus-merge-bindings-context).
* `mediatorQuerySourceIdentifyHypermedia`: A mediator over the [Query Source Identify Hypermedia bus](https://github.com/comunica/comunica/tree/master/packages/bus-query-source-identify-hypermedia).
