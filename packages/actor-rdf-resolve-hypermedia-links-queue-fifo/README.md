# Comunica FIFO RDF Resolve Hypermedia Links Queue Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-resolve-hypermedia-links-queue-fifo.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo)

An [RDF Resolve Hypermedia Links Queue](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-hypermedia-links-queue) actor
that provides a [`ILinkQueue`](https://comunica.github.io/comunica/interfaces/_comunica_bus_rdf_resolve_hypermedia_links_queue.ILinkQueue.html)
following the first in, first out strategy.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-resolve-hypermedia-links-queue-fifo
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-resolve-hypermedia-links-queue-fifo/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-resolve-hypermedia-links-queue/actors#fifo",
      "@type": "ActorRdfResolveHypermediaLinksQueueFifo"
    }
  ]
}
```
