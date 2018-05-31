# Comunica HTTP

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-http.svg)](https://www.npmjs.com/package/@comunica/actor-init-http)

An example init actor for Comunica that triggers a HTTP request using the HTTP bus.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-init-http
```

This package exposes the binary `comunica-http [url]`.

## Usage

The `config/config-example.json` contains an example on how to run this actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitHttp`,
the actor allows optional HTTP request parameters to be changed.

When executed, the actor will take the URL from the first CLI parameter,
combine it with the parameters from the config file,
perform the request, and print its response to stdout.

Executing the following:

```
$ node bin/run.js http://fragments.linkedsoftwaredependencies.org
```

will print the response.
