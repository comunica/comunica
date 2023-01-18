# Comunica SHACL Compact Syntax RDF Serialize Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-serialize-shaclc.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-serialize-shaclc)

A comunica [SHACL Compact Syntax](https://w3c.github.io/shacl/shacl-compact-syntax/) and [Extended SHACL Compact Syntax](https://github.com/jeswr/shaclcjs#extended-shacl-compact-syntax) RDF Serialize Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-serialize-shaclc
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-serialize-shaclc/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-serialize/actors#shaclc",
      "@type": "ActorRdfSerializeShaclc"
    }
  ]
}
```
