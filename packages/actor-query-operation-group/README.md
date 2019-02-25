# Comunica Group Query Operation Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-query-operation-group.svg)](https://www.npmjs.com/package/@comunica/actor-query-operation-group)

A comunica Group Query Operation Actor.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-query-operation-group
```

## Usage

Group actor handles SPARQL Algebra GROUP operations. Example:

```SELECT * WHERE {?x ?y ?z} GROUP BY ?x```

turn in to:

```js
{
    "type": "project",
    "input": {
        "type": "group",
        "input": {
            "type": "bgp",
            "patterns": [
                {
                    "subject": { "value": "x" },
                    "predicate": { "value": "y" },
                    "object": { "value": "z" },
                    "graph": { "value": "" },
                    "type": "pattern"
                }
            ]
        },
        "variables": [{"value": "x"}],
        "aggregates": []
    },
    "variables": [
        {
            "value": "x"
        },
        {
            "value": "y"
        },
        {
            "value": "z"
        }
    ]
}
```
