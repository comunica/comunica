# Comunica Free Variables RDF Join Entries Sort Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-join-entries-sort-free-variables.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-join-entries-sort-free-variables)

An [RDF Join Entries Sort](https://github.com/comunica/comunica/tree/master/packages/bus-rdf-join-entries-sort) actor
for join entries over sources of which the cardinalities are unknown,
such as SPARQL endpoints that are not sent COUNT queries.

Following the join ordering of FedX
([Schwarte et al., ISWC 2011](https://doi.org/10.1007/978-3-642-25073-6_38)),
it orders the entries greedily, each time picking the entry that is cheapest
given the variables that the earlier entries bind.
Entries are compared by, in order:

1. Whether they have variables in common with the earlier entries, as other entries lead to cross products.
2. The lowest cost among their patterns with the variable counting heuristic
   ([Stocker et al., WWW 2008](https://doi.org/10.1145/1367497.1367578)), in which bound variables count as constants,
   as an entry can be evaluated from its most selective pattern.
3. Whether all their patterns have the same subject, as the results of such a star are bounded by its most selective pattern,
   while joins over objects can multiply results.
4. The number of sources that evaluate them, as each source is sent a request.
5. The number of their patterns, as more patterns restrict the results further.
6. Their cardinality, if it is known.

It only applies to entries of which operations are assigned to sources, if a cardinality is unknown.
In that case, it wins over the cardinality-based sort, as that one places entries with an unknown cardinality last,
however selective they are.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/actor-rdf-join-entries-sort-free-variables
```

## Configure

After installing, this package can be added to your engine's configuration as follows:
```text
{
  "@context": [
    ...
    "https://linkedsoftwaredependencies.org/bundles/npm/@comunica/actor-rdf-join-entries-sort-free-variables/^5.0.0/components/context.jsonld"
  ],
  "actors": [
    ...
    {
      "@id": "urn:comunica:default:rdf-join-entries-sort/actors#free-variables",
      "@type": "ActorRdfJoinEntriesSortFreeVariables"
    }
  ]
}
```
