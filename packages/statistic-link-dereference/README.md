# Comunica Statistic Link Dereference

[![npm version](https://badge.fury.io/js/%40comunica%2Fstatistic-link-dereference.svg)](https://www.npmjs.com/package/@comunica/statistic-link-dereference)

A statistics tracker package for tracking link dereferences during query execution in Comunica. This class must be added to the context with the key defined in the class.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/statistic-link-dereference
```

## Using the tracker

```javascript
    const QueryEngine = require('@comunica/query-sparql').QueryEngine;
    const myEngine = new QueryEngine();
    const statisticTracker = new StatisticLinkDereference();

    // Print any data emitted by the tracker
    statisticTracker.on((data) => console.log(data));

    // Add the tracker to the context
    let context = {sources: ['https://fragments.dbpedia.org/2015/en']};
    context[statisticTracker.key.name] = statisticTracker;

    // Execute the query
    const bindingsStream = await myEngine.queryBindings(`
    SELECT ?s ?p ?o WHERE {
        ?s ?p ?o
    } LIMIT 10`, context);
    bindingsStream.on('data', (binding) => {
        console.log(binding.toString());
    });
```
