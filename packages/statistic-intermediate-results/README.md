# Comunica Statistic Link Dereference

[![npm version](https://badge.fury.io/js/%40comunica%2Fstatistic-link-dereference.svg)](https://www.npmjs.com/package/@comunica/statistic-link-dereference)

A statistics tracker package for tracking intermediate results produced during query execution in Comunica.
This class must be added to the context with the key defined in the class.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/statistic-intermediate-results
```
## Using the tracker

### Adding the tracker to the context
```javascript
    // Import the tracker
    import { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';

    // Create the Comunica engine
    const QueryEngine = require('@comunica/query-sparql').QueryEngine;
    const myEngine = new QueryEngine();
    const statisticTracker = new StatisticIntermediateResults();

    // Set up an event listener to handle data emitted by the tracker
    statisticTracker.on((intermediateResult) => console.log(intermediateResult));

    // Create a context object with the data source and add the tracker
    let context = {sources: ['https://fragments.dbpedia.org/2015/en']};
    context[statisticTracker.key.name] = statisticTracker;

    // Execute a SPARQL query using the engine with the configured context
    const bindingsStream = await myEngine.queryBindings(`
    SELECT ?s ?p ?o WHERE {
        ?s ?p ?o
    } LIMIT 10`, context);

    // Process the query results, as this runs intermediate results will be
    // logged
    bindingsStream.on('data', (binding) => {
        console.log(binding.toString());
    });
```

### Allowing Comunica to call the tracker
Comunica does not call the `updateStatistic` function by default. To enable this users should first add the following actors to the config:
`actor-query-operation-wrap-stream` and `actor-rdf-join-wrap-stream`. This will call the `bus-iterator-transform` for each intermediate iterator produced
by Comunica. Users should then add `actor-iterator-transform-record-intermediate-results` to the config, which will call the `updateStatistic` method of `statistic-intermediate-result` for each produced intermediate result.
