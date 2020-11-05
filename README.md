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
<a href="https://travis-ci.com/comunica/comunica"><img src="https://travis-ci.com/comunica/comunica.svg?branch=master" alt="Build Status"></a>
<a href="https://coveralls.io/github/comunica/comunica?branch=master"><img src="https://coveralls.io/repos/github/comunica/comunica/badge.svg?branch=master" alt="Coverage Status"></a>
<a href="https://zenodo.org/badge/latestdoi/107345960"><img src="https://zenodo.org/badge/107345960.svg" alt="DOI"></a>
<a href="https://gitter.im/comunica/Lobby"><img src="https://badges.gitter.im/comunica.png" alt="Gitter chat"></a>
</p>

**[Learn more about Comunica on our website](https://comunica.dev/).**

## Query with Comunica

Read one of our [guides to **get started** with querying](https://comunica.dev/docs/query/getting_started/):

* [Querying from the command line](https://comunica.dev/docs/query/getting_started/query_cli/)
* [Querying local files from the command line](https://comunica.dev/docs/query/getting_started/query_cli_file/)
* [Querying in a JavaScript app](https://comunica.dev/docs/query/getting_started/query_app/)
* [Querying in a JavaScript browser app](https://comunica.dev/docs/query/getting_started/query_browser_app/)
* [Setting up a SPARQL endpoint](https://comunica.dev/docs/query/getting_started/setup_endpoint/)
* [Querying from a Docker container](https://comunica.dev/docs/query/getting_started/query_docker/)
* [Setting up a Web client](https://comunica.dev/docs/query/getting_started/setup_web_client/)
* [Query using the latest development version](https://comunica.dev/docs/query/getting_started/query_dev_version/)

Or jump right into one of the available query engines:
* [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql#readme): SPARQL/GraphQL querying from JavaScript applications or the CLI ([Browser-ready via a CDN](https://github.com/rdfjs/comunica-browser))
* [Comunica SPARQL File](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql-file#readme): Library to query over local RDF files
* [Comunica SPARQL RDFJS](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql-rdfjs#readme): Library to query over in-memory [RDFJS-compliant sources](https://rdf.js.org/stream-spec/#source-interface).
* [Comunica SPARQL HDT](https://github.com/comunica/comunica-actor-init-sparql-hdt#readme): Library to query over local HDT files

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
and can be used in a development environment, such as querying with [Comunica SPARQL (`packages/actor-init-sparql`)](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql).

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
This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
