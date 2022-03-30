# Comunica Dereference Rule Parse Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-dereference-rule.svg)](https://www.npmjs.com/package/@comunica/actor-dereference-rule-parse)

A an for dereferencing a path or URL into a parsed stream of rules.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-dereference-rule-parse
```


## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-dereference-rule-parse/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:dereference-rule/actors#parse",
      "@type": "ActorDereferenceRuleParse",
      "mediatorDereference": { "@id": "urn:comunica:default:dereference/mediators#main" },
      "mediatorParse": { "@id": "urn:comunica:default:rule-parse/mediators#main" }
    }
  ]
}
```

### Config Parameters

* `mediatorDereference`: A mediator over the [Dereference bus](https://github.com/comunica/comunica/tree/master/packages/bus-dereference).
* `mediatorParse`: A mediator over the [Rule Parse bus](https://github.com/comunica/comunica/tree/master/packages/bus-rule-parse).
