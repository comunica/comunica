# Comunica Follow Redirects Http Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-http-native.svg)](https://www.npmjs.com/package/@comunica/actor-http-native)

**DEPRECATED: use the more flexible @comunica/actor-http-fetch instead without loss of performance.**

An [HTTP](https://github.com/comunica/comunica/tree/master/packages/bus-http) actor that
uses Node's request API (`XMLHttpRequest` in the browser) to perform HTTP requests.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-http-native
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-http-native/^2.0.0/components/context.jsonld"  
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:http/actors#native",
      "@type": "ActorHttpNative"
    }
  ]
}
```

### Config Parameters

* `agentOptions`: The agent JSON options for the HTTP agent. _(optional)_ 
