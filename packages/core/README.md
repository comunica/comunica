# Comunica Core

[![npm version](https://badge.fury.io/js/%40comunica%2Fcore.svg)](https://www.npmjs.com/package/@comunica/core)

The core framework of Comunica, which consists of a **actors**, **buses**, and **mediators**.

**[Click here to learn more about this core architecture](https://comunica.dev/docs/modify/advanced/architecture_core/).**

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/core
```

## Exported classes

* [`Actor`](https://comunica.github.io/comunica/classes/_comunica_core.Actor.html): An actor can act on messages of certain types and provide output of a certain type.
* [`Bus`](https://comunica.github.io/comunica/classes/_comunica_core.Bus.html): A publish-subscribe bus for sending actions to actors to test whether or not they can run an action.
* [`Mediator`](https://comunica.github.io/comunica/classes/_comunica_core.Mediator.html): A mediator can mediate an action over a bus of actors.
* [`ActionObserver`](https://comunica.github.io/comunica/classes/_comunica_core.ActionObserver.html): An ActionObserver can passively listen to Actor.run inputs and outputs for all actors on a certain bus.
* [`BusIndexed`](https://comunica.github.io/comunica/classes/_comunica_core.BusIndexed.html): A bus that indexes identified actors, so that actions with a corresponding identifier can be published more efficiently.
* [`Logger`](https://comunica.github.io/comunica/classes/_comunica_types.Logger.html): A logger accepts messages from different levels and emits them in a certain way.
* [`ActionContext`](https://comunica.github.io/comunica/classes/_comunica_core.ActionContext.html): Implementation of IActionContext using Immutable.js.
* [`TestResult`])(https://comunica.github.io/comunica/classes/_comunica_core.TestResult.html): A test result represents the result of an actor test that can either be passed or failed.
