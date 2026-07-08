# Comunica rdf-parser.ts RDF Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-parse-rdf-parser-ts.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-parse-rdf-parser-ts)

An [RDF Parse](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-parse) actor that handles
Turtle, TriG, N-Quads, and N-Triples using [rdf-parser.ts](https://www.npmjs.com/package/rdf-parser-ts).

This actor does not handle N3 rules/formulas. Use `@comunica/actor-rdf-parse-n3` when `text/n3` support is required.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Parser performance

The table below compares this actor with `@comunica/actor-rdf-parse-n3` on parser-only synthetic inputs,
without executing a SPARQL query. The benchmark invokes each actor's `runHandle` method and consumes the resulting quad stream.

Environment: Linux, Node.js 25.9.0, 1,000,000 quads/triples per run, 5 measured runs after 1 warmup,
`node --expose-gc`. The table reports median wall-clock time.

| Media type | N3.js actor | rdf-parser.ts actor | Speedup |
| --- | ---: | ---: | ---: |
| `application/n-triples` | 1.110s (900,632 quads/s) | 1.111s (900,100 quads/s) | 1.00x |
| `application/n-quads` | 1.563s (639,792 quads/s) | 1.288s (776,689 quads/s) | 1.21x |
| `text/turtle` | 1.648s (606,939 quads/s) | 1.441s (693,910 quads/s) | 1.14x |

These numbers are indicative local measurements. End-to-end Comunica query performance can differ because query planning,
source access, iterator scheduling, and result materialization may dominate parser cost.

## Install

```bash
$ yarn add @comunica/actor-rdf-parse-rdf-parser-ts
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-parse-rdf-parser-ts/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-parse/actors#rdf-parser-ts",
      "@type": "ActorRdfParseRdfParserTs",
      "priorityScale": 1.0
    }
  ]
}
```

It can be configured next to `@comunica/actor-rdf-parse-n3`; content negotiation priorities decide which actor is selected for overlapping RDF media types.

### Config Parameters

* `priorityScale`: An optional priority for this parser, used for content negotiation, defaults to `1`.
