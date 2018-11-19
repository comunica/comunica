# Comunica Primary Topic RDF Metadata Actor

[![npm version](https://badge.fury.io/js/%40comunica%2Factor-rdf-metadata-primary-topic.svg)](https://www.npmjs.com/package/@comunica/actor-rdf-metadata-primary-topic)

A Comunica RDF Metadata Actor that splits off the metadata based on the existence of a `foaf:primaryTopic` link.

**Warning:** Use this at your own risk, as this actor _requires_ `foaf:primaryTopic` to be linked with the metadata graph,
while the [spec keeps this optional](https://www.hydra-cg.com/spec/latest/triple-pattern-fragments/).
Furthermore, `foaf:primaryTopic` must come _before_ the metadata triples.
But in cases where `foaf:primaryTopic` is always used, this actor will be very performant.

This module is part of the [Comunica framework](https://github.com/comunica/comunica).

## Install

```bash
$ yarn add @comunica/actor-rdf-metadata-primary-topic
```

## Usage

TODO
