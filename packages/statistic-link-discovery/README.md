# Comunica Statistic Link Discovery

[![npm version](https://badge.fury.io/js/%40comunica%2Fstatistic-link-discovery.svg)](https://www.npmjs.com/package/@comunica/statistic-link-discovery)

A statistics tracker package for tracking discovered links during query execution in Comunica. This class must be added to the context with the key defined in the class.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/statistic-link-discovery
```

## Adding to the context

```javascript
    let context = new ActionContext();
    const statisticTracker = new StatisticLinkDiscovery();
    context = context.set(statisticTracker.key, statisticTracker);
```
