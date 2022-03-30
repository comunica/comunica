# Comunica N3 Rule Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rule-parse-n3.svg)](https://www.npmjs.com/package/@comunica/actor-rule-parse-n3)

A comunica N3 Rule Parse Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rule-parse-n3
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rule-parse-n3/^1.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": TODO,
      "@type": "ActorRuleParseN3"
    }
  ]
}
```

### Config Parameters

TODO
