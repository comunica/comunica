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

* [`Actor`](https://comunica.github.io/comunica/classes/core.actor-1.html): An actor can act on messages of certain types and provide output of a certain type.
* [`Bus`](https://comunica.github.io/comunica/classes/core.bus-1.html): A publish-subscribe bus for sending actions to actors to test whether or not they can run an action.
* [`Mediator`](https://comunica.github.io/comunica/classes/core.mediator-1.html): A mediator can mediate an action over a bus of actors.
* [`ActionObserver`](https://comunica.github.io/comunica/classes/core.actionobserver-1.html): An ActionObserver can passively listen to Actor.run inputs and outputs for all actors on a certain bus.
* [`BusIndexed`](https://comunica.github.io/comunica/classes/core.busindexed-1.html): A bus that indexes identified actors, so that actions with a corresponding identifier can be published more efficiently.
* [`Logger`](https://comunica.github.io/comunica/classes/core.logger-1.html): A logger accepts messages from different levels and emits them in a certain way.
