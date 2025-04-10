# Comunica Action Observer for HTTP Requests

[![npm version](https://badge.fury.io/js/%40comunica%2Fobserver-http-requests.svg)](https://www.npmjs.com/package/@comunica/observer-http-requests)

An [HTTP](https://github.com/comunica/comunica/tree/master/packages/bus-http) observer that
tracks the number of outgoing requests from the engine, for use in metadata reporting.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/observer-http-requests
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```json
{
  "@context": [
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/observer-http-requests/^4.0.0/components/context.jsonld"
  ],
  "@graph": [
    {
      "@id": "urn:comunica:default:http/observers#requests",
      "@type": "ActionObserverHttpRequests"
    }
  ]
}
```

### Config Parameters

* `actors`: An array of actors that perform outgoing HTTP requests.
