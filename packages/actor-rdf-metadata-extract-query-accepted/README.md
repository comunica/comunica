# Comunica Query Accepted RDF Metadata Extract Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-extract-query-accepted.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-extract-query-accepted)

An [RDF Metadata Extract](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-metadata-extract) actor that
extracts the `Accept-Query` header, which servers use to advertise support for
the [HTTP QUERY method (RFC 10008)](https://www.rfc-editor.org/rfc/rfc10008.html)
together with the query formats they accept.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-extract-query-accepted
```

## Metadata entries

This actor adds the following entries to the metadata object.

* `queryAccepted`: `[ 'application/sparql-query', ... ]`.

Media type parameters and weights are stripped, so an `Accept-Query` value of
`application/sparql-query;charset=utf-8;q=0.9` is extracted as `application/sparql-query`.

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-metadata-extract-query-accepted/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-metadata-extract/actors#query-accepted",
      "@type": "ActorRdfMetadataExtractQueryAccepted"
    }
  ]
}
```
