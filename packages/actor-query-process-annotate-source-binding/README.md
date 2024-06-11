# Comunica Annotate Source Binding Query Process Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-process-annotate-source-binding.svg)](https://www.npmjs.com/package/@comunica/actor-query-process-annotate-source-binding)

A comunica Annotate Source Binding Query Process Actor that wraps around [actor-query-process-sequential](https://www.npmjs.com/package/@comunica/actor-query-process-sequential).
The wrapper processes sources in the context of any produced bindings.
It creates a new binding variable ```_source``` with a value equal to the extracted sources, enabling any serialization actor to include the tracked source information.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-query-process-annotate-source-binding
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-query-process-annotate-source-binding/^1.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:query-process/actors#annotate-source-binding",
      "@type": "ActorQueryProcessAnnotateSourceBinding"
    }
  ]
}
```

### Config Parameters

* `mediatorQueryProcess`: A mediator over the [query process bus](https://github.com/comunica/comunica/tree/master/packages/bus-context-preprocess).
