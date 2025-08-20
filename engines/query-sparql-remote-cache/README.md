# Comunica SPARQL

[![npm version](https://badge.fury.io/js/%40comunica%2Fquery-sparql.svg)](https://www.npmjs.com/package/@comunica/query-sparql)
[![Docker Pulls](https://img.shields.io/docker/pulls/comunica/query-sparql.svg)](https://hub.docker.com/r/comunica/query-sparql/)

Comunica SPARQL is a SPARQL query engine for JavaScript for querying over decentralized RDF knowledge graphs on the Web.

It's main distinguishing features are the following:

* Execute [SPARQL 1.1](https://www.w3.org/TR/sparql11-query/) or [GraphQL-LD](https://github.com/rubensworks/graphql-ld.js) queries.
* Federated querying over [heterogeneous interfaces](https://comunica.dev/docs/query/advanced/source_types/), such as RDF files, SPARQL endpoints, [Triple Pattern Fragments](https://linkeddatafragments.org/), or [Solid data pods](https://inrupt.com/solid).
* High modularity enabling [easy extensions and customization](https://comunica.dev/docs/modify/).
* Runs in JavaScript using [Node.JS](http://nodejs.org/), in the browser, and via the command-line.
* Update sources using [SPARQL 1.1 Update queries](https://www.w3.org/TR/sparql11-update/).

**[Learn more about Comunica on our website](https://comunica.dev/).**

**This actor can not query over local files for security reasons, but [Comunica SPARQL file](https://github.com/comunica/comunica/tree/master/engines/query-sparql-file#readme) can.**

_Internally, this is a [Comunica module](https://comunica.dev/) that is configured with modules to execute SPARQL queries._

## Supported by

Comunica is a community-driven project, sustained by the [Comunica Association](https://comunica.dev/association/).
If you are using Comunica, [becoming a sponsor or member](https://opencollective.com/comunica-association) is a way to make Comunica sustainable in the long-term.

Our top sponsors are shown below!

<a href="https://opencollective.com/comunica-association/sponsor/0/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/comunica-association/sponsor/1/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/comunica-association/sponsor/2/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/comunica-association/sponsor/3/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/3/avatar.svg"></a>

## Installation

Comunica requires [Node.JS](http://nodejs.org/) 14.0 or higher and is tested on OSX and Linux.

The easiest way to install the client is by installing it from NPM as follows:

```bash
$ [sudo] npm install -g @comunica/query-sparql
```

Alternatively, you can install from the latest GitHub sources.
For this, please refer to the README of the [Comunica monorepo](https://github.com/comunica/comunica).

## Execute SPARQL queries

This actor can be used to execute SPARQL queries from
the command line, HTTP (SPARQL protocol), within a Node.JS application, or from a browser.

### Usage from the command line

Show 100 triples from http://fragments.dbpedia.org/2015-10/en:

```bash
$ comunica-sparql https://fragments.dbpedia.org/2015-10/en "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show all triples from http://dbpedia.org/resource/Belgium:

```bash
$ comunica-sparql https://dbpedia.org/resource/Belgium "CONSTRUCT WHERE { ?s ?p ?o }"
```

Combine multiple sources:

```bash
$ comunica-sparql https://fragments.dbpedia.org/2015-10/en \
  file@https://dbpedia.org/resource/Belgium "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Show the help with all options:

```bash
$ comunica-sparql --help
```

The dynamic variant of this executable is `comunica-dynamic-sparql`.
An alternative config file can be passed via the `COMUNICA_CONFIG` environment variable.

When you are working with this module in the Comunica monorepo development environment,
this command can be invoked directly as follows (when inside the `engines/query-sparql` folder):

```bash
node bin/query.js https://fragments.dbpedia.org/2016-04/en "CONSTRUCT WHERE { ?s ?p ?o } LIMIT 100"
```

Use `bin/query-dynamic.js` when running dynamically inside the Comunica monorepo development environment.

_[**Read more** about querying from the command line](https://comunica.dev/docs/query/getting_started/query_cli/)._

### Usage as a SPARQL endpoint

Start a webservice exposing https://fragments.dbpedia.org/2015-10/en via the SPARQL protocol, i.e., a _SPARQL endpoint_.

```bash
$ comunica-sparql-http https://fragments.dbpedia.org/2015/en
```

This command has a similar signature to `comunica-sparql`, minus the query input options.

Show the help with all options:

```bash
$ comunica-sparql-http --help
```

The SPARQL endpoint can only be started dynamically.
An alternative config file can be passed via the `COMUNICA_CONFIG` environment variable.

Use `bin/http.js` when running in the Comunica monorepo development environment.

_[**Read more** about setting up a SPARQL endpoint](https://comunica.dev/docs/query/getting_started/setup_endpoint/)._

### Usage within application

The easiest way to create an engine (with default config) is as follows:

```javascript
const QueryEngine = require('@comunica/query-sparql').QueryEngine;

const myEngine = new QueryEngine();
```

Alternatively, an engine can also be created dynamically with a custom config:

```javascript
const QueryEngineFactory = require('@comunica/query-sparql').QueryEngineFactory;

const myEngine = await new QueryEngineFactory().create({ configPath: 'path/to/config.json' });
```

Once you have created your query engine,
you can use it to call one of the async query methods,
such as `queryBindings` for `SELECT` queries,
`queryQuads` for `CONSTRUCT` and `DESCRIBE` queries,
`queryBoolean` for `ASK` queries,
or `queryVoid` for update queries.

All query methods have the require a query string and a context object,
with the return type depending on the query type.

For example, a `SELECT` query can be executed as follows:

```javascript
const bindingsStream = await myEngine.queryBindings(`
  SELECT ?s ?p ?o WHERE {
    ?s ?p <http://dbpedia.org/resource/Belgium>.
    ?s ?p ?o
  } LIMIT 100`, {
  sources: [ 'http://fragments.dbpedia.org/2015/en' ],
});

// Consume results as a stream (best performance)
bindingsStream.on('data', (binding) => {
  console.log(binding.toString()); // Quick way to print bindings for testing

  console.log(binding.has('s')); // Will be true

  // Obtaining values
  console.log(binding.get('s').value);
  console.log(binding.get('s').termType);
  console.log(binding.get('p').value);
  console.log(binding.get('o').value);
});
bindingsStream.on('end', () => {
  // The data-listener will not be called anymore once we get here.
});
bindingsStream.on('error', (error) => {
  console.error(error);
});

// Consume results as async iterable (easier)
for await (const binding of bindingsStream) {
  console.log(binding.toString());
}

// Consume results as an array (easier)
const bindings = await bindingsStream.toArray();
console.log(bindings[0].get('s').value);
console.log(bindings[0].get('s').termType);
```

Optionally, specific [types of sources](https://comunica.dev/docs/query/advanced/source_types/) can be specified (_otherwise, the type of source will be detected automatically_):

```javascript
const bindingsStream = await myEngine.queryBindings(`...`, {
  sources: [
    'http://fragments.dbpedia.org/2015/en',
    {
      type: 'hypermedia',
      value: 'http://fragments.dbpedia.org/2016/en'
    },
    {
      type: 'file',
      value: 'https://www.rubensworks.net/'
    },
    new N3Store(),
    {
      type: 'sparql',
      value: 'https://dbpedia.org/sparql'
    },
  ],
});
```

**Note: Some SPARQL endpoints may be recognised as a file instead of a SPARQL endpoint due to them not supporting [SPARQL Service Description](https://www.w3.org/TR/sparql11-service-description/), which may produce incorrect results. For these cases, the `sparql` type MUST be set.**

For `CONSTRUCT` and `DESCRIBE` queries,
results can be collected as follows.

```javascript
const quadStream = await myEngine.queryQuads(`
  CONSTRUCT WHERE {
    ?s ?p ?o
  } LIMIT 100`, {
  sources: ['http://fragments.dbpedia.org/2015/en'],
});

// Consume results as a stream (best performance)
quadStream.on('data', (quad) => {
    console.log(quad.subject.value);
    console.log(quad.predicate.value);
    console.log(quad.object.value);
    console.log(quad.graph.value);
});

// Consume results as asynciterable (easier)
for await (const quad of quadStream) {
  console.log(quad.subject.value);
}

// Consume results as an array (easier)
const quads = await quadStream.toArray();
console.log(quads[0].subject.value);
console.log(quads[0].predicate.value);
console.log(quads[0].object.value);
console.log(quads[0].graph.value);
```

Finally, `ASK` queries return async booleans.

```javascript
const hasMatches = await myEngine.queryAsk(`
  ASK {
    ?s ?p <http://dbpedia.org/resource/Belgium>
  }`, {
  sources: ['http://fragments.dbpedia.org/2015/en'],
})
```

_[**Read more** about querying an application](https://comunica.dev/docs/query/getting_started/query_app/)._

## Learn more

This README just shows the tip of the iceberg!
Learn more about Comunica's functionalities in the following guides:

* _[Updating from the command line](https://comunica.dev/docs/query/getting_started/update_cli/)_
* _[Updating in a JavaScript app](https://comunica.dev/docs/query/getting_started/update_app/)_
* _[Querying in a JavaScript browser app](https://comunica.dev/docs/query/getting_started/query_browser_app/)_
* _[Passing query options](https://comunica.dev/docs/query/advanced/context/)_
* _[Supported source types](https://comunica.dev/docs/query/advanced/source_types/)_
* _[Supported destination types](https://comunica.dev/docs/query/advanced/destination_types/)_
* _[Formatting results](https://comunica.dev/docs/query/advanced/result_formats/)_
* _[Supported specifications](https://comunica.dev/docs/query/advanced/specifications/)_
* _[Logging and debugging](https://comunica.dev/docs/query/advanced/logging/)_
* _[Caching](https://comunica.dev/docs/query/advanced/caching/)_
* _[Using a proxy](https://comunica.dev/docs/query/advanced/proxying/)_
* _[HTTP basic authentication](https://comunica.dev/docs/query/advanced/basic_auth/)_
* _[GraphQL-LD](https://comunica.dev/docs/query/advanced/graphql_ld/)_
* _[Docker](https://comunica.dev/docs/query/getting_started/query_docker/)_
* _[*Full documentation*](https://comunica.dev/docs/)_
