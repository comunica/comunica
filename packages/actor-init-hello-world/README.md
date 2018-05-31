# Comunica Hello World

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-init-hello-world.svg)](https://www.npmjs.com/package/@comunica/actor-init-hello-world)

An example Hello World init actor for Comunica.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-init-hello-world
```

## Usage

The `config/config-example.json` contains an example on how to run the Hello World actor,
which will trigger on the Runner's 'init' event.

As defined by `components/ActorInitHelloWorld`,
the actor allows the 'hello' parameter to be changed,
and defaults to 'Hello'.

When executed, the actor will print the 'hello' parameter value
to the console, followed by all command line parameters.

Executing the following:

```
$ node bin/run.js Desmond Hume
```

will print `Hi Desmond Hume`.
