# Comunica Http Dereference Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-dereference-http.svg)](https://www.npmjs.com/package/@comunica/actor-dereference-http)

An [Dereference](https://github.com/comunica/comunica/tree/master/packages/bus-dereference) actor that
resolves the URL using the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).

An Dereference actor implementation for Comunica that resolves the URL using the HTTP bus.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-dereference-http
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-dereference-http/^4.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:dereference/actors#http",
      "@type": "ActorDereferenceHttp",
      "beforeActors": { "@id": "urn:comunica:default:dereference/actors#fallback" },
      "mediatorHttp": { "@id": "urn:comunica:default:http/mediators#main" },
      "maxAcceptHeaderLength": 1024,
      "maxAcceptHeaderLengthBrowser": 128,
    }
  ]
}
```

### Config Parameters

* `mediatorHttp`: A mediator over the [HTTP bus](https://github.com/comunica/comunica/tree/master/packages/bus-http).
* `maxAcceptHeaderLength`: The maximum allowed accept header value length for non-browser environments, defaults to `1024`.
* `maxAcceptHeaderLengthBrowser`: The maximum allowed accept header value length for browser environments, defaults to `128`.
