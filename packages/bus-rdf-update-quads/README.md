# Comunica Bus RDF Update Quads

[![npm version](https://badge.fury.io/js/%40comunica%2Fbus-rdf-update-quads.svg)](https://www.npmjs.com/package/@comunica/bus-rdf-update-quads)

A bus for inserting and deleting stream of quads.

This module is part of the [Comunica framework](https://github.com/comunica/comunica),
and should only be used by [developers that want to build their own query engine](https://comunica.dev/docs/modify/).

[Click here if you just want to query with Comunica](https://comunica.dev/docs/query/).

## Install

```bash
$ yarn add @comunica/bus-rdf-update-quads
```

## Usage

## Bus usage

* **Context**: `"https://linkedsoftwaredependencies.org/bundles/npm/@comunica/bus-rdf-update-quads/^5.0.0/components/context.jsonld"`
* **Bus name**: `ActorRdfUpdateQuads:_default_bus`

## Creating actors on this bus

Actors extending [`ActorRdfUpdateQuads`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_update_quads.ActorRdfUpdateQuads.html) are automatically subscribed to this bus.

[`ActorRdfUpdateQuadsDestination`](https://comunica.github.io/comunica/classes/_comunica_bus_rdf_update_quads.ActorRdfUpdateQuadsDestination.html) is an extension of `ActorRdfUpdateQuads`
that delegates insert and delete streams to an [`IQuadDestination`](https://comunica.github.io/comunica/interfaces/_comunica_bus_rdf_update_quads.IQuadDestination.html).

## Transactions

An update request has either all or none of its effects, as SPARQL 1.1 Update prescribes,
for destinations that support transactions.
Such an `IQuadDestination` implements `beginTransaction`, which returns an `IQuadDestinationTransaction`:
it records the changes of `update`, `deleteGraphs` and `createGraphs`, and only applies them on `commit`.

`ActorRdfUpdateQuadsDestination` changes destinations through the transaction of the update request,
which is in the context under `KeysRdfUpdateQuads.transaction`.
All operations of a request share one transaction per destination, as identified by its `transactionKey`,
which is committed once all of them succeed, and rolled back if one of them fails.
An operation outside of such a request runs in a transaction of its own.
Destinations that do not implement `beginTransaction` are changed directly, as before.
