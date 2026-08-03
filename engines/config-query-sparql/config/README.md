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

## Config versioning

In general, adding actors to configs should be considered a **breaking change**.
This is because if external packages depend on this config package,
and if an actor were to be added to the config in a minor/patch update,
an in-range update of the config dependency would cause the external package to break,
since the external package did not include this new actor yet as an actual dependency.
As such, only changes to parameters and such are allowed in configs within a single major version range.

If actors need to be added, it is recommended to use versioned config files.
If for example an actor needs to be added to `rdf-metadata-extract/actors.json`,
a copy of this file must be created with the name including the current comunica version,
e.g. `rdf-metadata-extract/actors-v4-1-0.json`.
Then, all (relevant) configs importing this file must to the same,
e.g. `config/config-default.json` should be copied to `config/config-default-v4-1-0.json`
with the import changed to `rdf-metadata-extract/actors-v4-1-0.json`.
Then finally, all engine packages (e.g. `engines/query-sparql`) depending on this config
(e.g. in `config/config-default.json`) must be modified to include this renamed config file.
(no versioned config is needed here, as external packages are not supposed to rely on this config file directly)
An example of such a change can be seen in this commit:
https://github.com/comunica/comunica/commit/27412e0f1e26db23b854bfc7e82a63189999ebf3

In every major update of Comunica, all of these versioned configs should be removed.
Because they are only meant to exist temporarily for ensuring backwards-compatibility.
