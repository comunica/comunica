# Comunica String Source RDF Resolve Quad Pattern Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-resolve-quad-pattern-rdf-resolve-quad-pattern-string-source.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-resolve-quad-pattern-rdf-resolve-quad-pattern-string-source)

An [RDF Resolve Quad Pattern](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern) actor that handles string-based source.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

This actor enables to the possibility to provide data sources using the context in the form of a string. The source must respect the `rdf` serialization supported by comunica. Here an example of a source provided by the context
```js
{ sources: [{ type: 'stringSource', value: `<ex:s> <ex:p> <ex:o>. <ex:s> <ex:p> <ex:z>.`, mediaType: 'text/turtle', baseIri: 'http://example.org/' }]}
```

## Install

```bash
$ yarn add @comunica/actor-rdf-resolve-quad-pattern-string-source
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-resolve-quad-pattern-string-source/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-resolve-quad-pattern/actors#string-source",
      "@type": "ActorRdfResolveQuadPatternStringSource",
      "mediatorRdfParse": { "@id": "urn:comunica:default:rdf-parse/mediators#parse" },
      "mediatorRdfResolveQuadPattern": { "@id": "urn:comunica:default:rdf-resolve-quad-pattern/mediators#main" },
      "beforeActors": { "@id": "urn:comunica:default:rdf-resolve-quad-pattern/actors#hypermedia" }
    }
  ]
}
```

### Config Parameters

* `mediatorRdfParse`: A mediator over the [RDF Parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse).
* `mediatorRdfResolveQuadPattern`: A mediator over the [RDF resolve quad pattern bus](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-resolve-quad-pattern).
