<p align="center">
  <a href="https://comunica.dev/">
    <img alt="Comunica" src="https://comunica.dev/img/comunica_red.svg" width="200">
  </a>
</p>

<p align="center">
  <strong>A knowledge graph querying framework for JavaScript</strong>
  <br />
  <i>Flexible SPARQL and GraphQL over decentralized RDF on the Web.</i>
</p>

<p align="center">
<a href="https://github.com/comunica/comunica/actions?query=workflow%3ACI"><img src="https://github.com/comunica/comunica/workflows/CI/badge.svg" alt="Build Status"></a>
<a href="https://coveralls.io/github/comunica/comunica?branch=master"><img src="https://coveralls.io/repos/github/comunica/comunica/badge.svg?branch=master" alt="Coverage Status"></a>
<a href="https://zenodo.org/badge/latestdoi/107345960"><img src="https://zenodo.org/badge/107345960.svg" alt="DOI"></a>
<a href="https://gitter.im/comunica/Lobby"><img src="https://img.shields.io/gitter/room/comunica/Lobby.svg?style=plastic&label=Lobby-Chat" alt="Gitter Lobby chat"></a>
<a href="https://gitter.im/comunica/core-dev"><img src="https://img.shields.io/gitter/room/comunica/Lobby.svg?style=plastic&label=Dev-Chat" alt="Gitter Dev chat"></a>
</p>

<p align="center">
  <a href="https://comunica.github.io/comunica/"><img src="https://img.shields.io/badge/doc-code_documentation-blueviolet"/></a>
</p>

**[Learn more about Comunica on our website](https://comunica.dev/).**

Comunica is an open-source project that is used by [many other projects](https://github.com/comunica/comunica/network/dependents),
and is being maintained by a [group of volunteers](https://github.com/comunica/comunica/graphs/contributors).
If you would like to support this project, you may consider:

* Contributing directly by [writing code or documentation](https://comunica.dev/contribute/); or
* Contributing indirectly by funding this project via [Open Collective](https://opencollective.com/comunica-association).

## Supported by

Comunica is a community-driven project, sustained by the [Comunica Association](https://comunica.dev/association/).
If you are using Comunica, [becoming a sponsor or member](https://opencollective.com/comunica-association) is a way to make Comunica sustainable in the long-term.

Our top sponsors are shown below!

<a href="https://opencollective.com/comunica-association/sponsor/0/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/comunica-association/sponsor/1/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/comunica-association/sponsor/2/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/comunica-association/sponsor/3/website" target="_blank"><img src="https://opencollective.com/comunica-association/sponsor/3/avatar.svg"></a>

## Query with Comunica

Read one of our [guides to **get started** with querying](https://comunica.dev/docs/query/getting_started/):

* [Querying from the command line](https://comunica.dev/docs/query/getting_started/query_cli/)
* [Updating from the command line](https://comunica.dev/docs/query/getting_started/update_cli/)
* [Querying local files from the command line](https://comunica.dev/docs/query/getting_started/query_cli_file/)
* [Querying in a JavaScript app](https://comunica.dev/docs/query/getting_started/query_app/)
* [Updating in a JavaScript app](https://comunica.dev/docs/query/getting_started/update_app/)
* [Querying in a JavaScript browser app](https://comunica.dev/docs/query/getting_started/query_browser_app/)
* [Setting up a SPARQL endpoint](https://comunica.dev/docs/query/getting_started/setup_endpoint/)
* [Querying from a Docker container](https://comunica.dev/docs/query/getting_started/query_docker/)
* [Setting up a Web client](https://comunica.dev/docs/query/getting_started/setup_web_client/)
* [Query using the latest development version](https://comunica.dev/docs/query/getting_started/query_dev_version/)

Or jump right into one of the available query engines:
* [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/engines/query-sparql#readme): SPARQL/GraphQL querying from JavaScript applications or the CLI ([Browser-ready via a CDN](https://github.com/rdfjs/comunica-browser))

 - Source Customisation
   * [Comunica SPARQL File](https://github.com/comunica/comunica/tree/master/engines/query-sparql-file#readme): Engine to query over local RDF files
   * [Comunica SPARQL RDFJS](https://github.com/comunica/comunica/tree/master/engines/query-sparql-rdfjs#readme): Engine to query over in-memory [RDFJS-compliant sources](https://rdf.js.org/stream-spec/#source-interface).
   * [Comunica SPARQL HDT](https://github.com/comunica/comunica-actor-init-sparql-hdt#readme): Library to query over local [HDT](https://www.rdfhdt.org/) files

 - Solid Customisation
   * [Comunica SPARQL Solid](https://github.com/comunica/comunica-feature-solid/tree/master/engines/query-sparql-solid#readme): Engine to query over files behind [Solid access control](https://solidproject.org/).

 - Link Traversal Research
   * [Comunica SPARQL Link Traversal](https://github.com/comunica/comunica-feature-link-traversal/tree/master/engines/query-sparql-link-traversal#readme): Engine to query over multiple files by following links between them.
   * [Comunica SPARQL Link Traversal Solid](https://github.com/comunica/comunica-feature-link-traversal/tree/master/engines/query-sparql-link-traversal-solid#readme): Engine to query within [Solid data vaults](https://solidproject.org/) by following links between documents.

 - Reasoning Support
   * [Comunica SPARQL Reasoning](https://github.com/comunica/comunica-feature-reasoning/tree/master/engines/query-sparql-reasoning): Engine that adds support for reasoning
   * [Comunica SPARQL Reasoning File](https://github.com/comunica/comunica-feature-reasoning/tree/master/engines/query-sparql-file-reasoning): Engine to query over local RDF files with support for reasoning

## Modify or Extending Comunica

[Read one of our guides to **get started** with modifying Comunica](https://comunica.dev/docs/modify/),
or have a look at some [examples](https://github.com/comunica/examples):

* [Querying with a custom configuration from the command line](https://comunica.dev/docs/modify/getting_started/custom_config_cli/)
* [Querying with a custom configuration in a JavaScript app](https://comunica.dev/docs/modify/getting_started/custom_config_app/)
* [Exposing your custom config as an npm package](https://comunica.dev/docs/modify/getting_started/custom_init/)
* [Exposing your custom config in a Web client](https://comunica.dev/docs/modify/getting_started/custom_web_client/)
* [Contributing a new query operation actor to the Comunica repository](https://comunica.dev/docs/modify/getting_started/contribute_actor/)
* [Adding a config parameter to an actor](https://comunica.dev/docs/modify/getting_started/actor_parameter/)

## Contribute

Interested in contributing? Have a look at our [contribution guide](https://comunica.dev/contribute/).

## Development Setup

_(JSDoc: https://comunica.github.io/comunica/)_

This repository should be used by Comunica module **developers** as it contains multiple Comunica modules that can be composed.
This repository is managed as a [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md)
using [Lerna](https://lernajs.io/).

If you want to develop new features
or use the (potentially unstable) in-development version,
you can set up a development environment for Comunica.

Comunica requires [Node.JS](http://nodejs.org/) 8.0 or higher and the [Yarn](https://yarnpkg.com/en/) package manager.
Comunica is tested on OSX, Linux and Windows.

This project can be setup by cloning and installing it as follows:

```bash
$ git clone https://github.com/comunica/comunica.git
$ cd comunica
$ yarn install
```

**Note: `npm install` is not supported at the moment, as this project makes use of Yarn's [workspaces](https://yarnpkg.com/lang/en/docs/workspaces/) functionality**

This will install the dependencies of all modules, and bootstrap the Lerna monorepo.
After that, all [Comunica packages](https://github.com/comunica/comunica/tree/master/packages) are available in the `packages/` folder
and can be used in a development environment, such as querying with [Comunica SPARQL (`@comunica/query-sparql`)](https://github.com/comunica/comunica/tree/master/engines/query-sparql).

Furthermore, this will add [pre-commit hooks](https://www.npmjs.com/package/pre-commit)
to build, lint and test.
These hooks can temporarily be disabled at your own risk by adding the `-n` flag to the commit command.

## Benchmarking

If you want to do benchmarking with Comunica in Node.js,
make sure to run Node.js in production mode as follows:

```bash
> NODE_ENV=production node packages/some-package/bin/some-bin.js
```

The reason for this is that Comunica extensively generates
internal `Error` objects.
In non-production mode, these also produce long stacktraces,
which may in some cases impact performance.

## Cite

If you are using or extending Comunica as part of a scientific publication,
we would appreciate a citation of our [article](https://comunica.github.io/Article-ISWC2018-Resource/).

```bibtex
@inproceedings{taelman_iswc_resources_comunica_2018,
  author    = {Taelman, Ruben and Van Herwegen, Joachim and Vander Sande, Miel and Verborgh, Ruben},
  title     = {Comunica: a Modular SPARQL Query Engine for the Web},
  booktitle = {Proceedings of the 17th International Semantic Web Conference},
  year      = {2018},
  month     = oct,
  url       = {https://comunica.github.io/Article-ISWC2018-Resource/}
}
```

## License
This code is copyrighted by [the Comunica Association](https://comunica.dev/association/) and [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
