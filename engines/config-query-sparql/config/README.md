This directory contains the default configuration files for Comunica SPARQL.

Guides on how to change these configuration files and package them into a new engine can be found on our [website](https://comunica.dev/docs/modify/).

## Directory structure

Each sub-directory represents a _bus_, and contains _actors_ and _mediators_,
corresponding to [Comunica's core architecture](https://comunica.dev/docs/modify/advanced/architecture_core/).

Each bus directory contains at least the file `actors.json` and `mediators.json`.
But each of those files can refer to other split files if the number of components becomes too large (e.g. for `query-operation`).
For example:

```text
rdf-metadata-extract/
    actors.json
    mediators.json
```

## IRI strategy

When instantiating actors or mediators, it is recommended to give them a unique `@id` to simplify debugging.
We recommend `@id`'s to be URNs instead of URLs in the `urn:comunica:default:` scope
to make it easier to change configuration files externally,
without having to override all `@id`'s for each different project.

**Actor id format**: `urn:comunica:default:<bus-id>/actors#<actor-id>`

Example: `urn:comunica:default:hash-bindings/actors#hydra-controls`

**Mediator id format**: `urn:comunica:default:<bus-id>/mediators#main`

Example: `urn:comunica:default:rdf-metadata-extract/mediators#main`

In most cases, only a single mediator per bus will exist, hence then `#main` suffix.
