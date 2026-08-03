# Comunica Term Function Regex Function Factory Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-function-factory-term-function-regex.svg)](https://www.npmjs.com/package/@comunica/actor-function-factory-term-regex)

A [function factory](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory) actor
that constructs a [term function](https://github.com/comunica/comunica/tree/master/packages/bus-function-factory/lib/ActorFunctionFactory.ts)
capable of evaluating the [Regex](https://www.w3.org/TR/sparql11-query/#func-regex) function.
The regex evaluation uses the JavaScript regex engine in 'unicode-mode'
thereby eliminating [Annex B](https://262.ecma-international.org/6.0/#sec-regular-expressions-patterns) behavior.
The `x` and `q` flag not present in the JS engine are implemented by preprocessing of the pattern.
As a result of using the JS regex engine, the bundle size of this package is small, but some non-spec compliant edge cases are present.
Examples are the skipped tests in [op.regex-test.ts](https://github.com/comunica/comunica/blob/master/packages/actor-function-factory-term-regex/test/op.regex-test.ts).

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-function-factory-term-regex
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-function-factory-term-regex/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:function-factory/actors#term-function-regex",
      "@type": "ActorFunctionFactoryTermRegex"
    }
  ]
}
```
