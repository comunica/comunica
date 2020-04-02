# Comunica

[![Build Status](https://travis-ci.org/comunica/comunica.svg?branch=master)](https://travis-ci.org/comunica/comunica)
[![Coverage Status](https://coveralls.io/repos/github/comunica/comunica/badge.svg?branch=master)](https://coveralls.io/github/comunica/comunica?branch=master)
[![DOI](https://zenodo.org/badge/107345960.svg)](https://zenodo.org/badge/latestdoi/107345960)
[![Gitter chat](https://badges.gitter.im/comunica.png)](https://gitter.im/comunica/Lobby)

Comunica is a highly modular and flexible query engine platform for the Web.

As Comunica is a query engine _platform_,
various configurations can be built for it,
each leading to a different query engine.

**If you just want to query, have a look at these pre-built engines**:
* [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql#readme): SPARQL/GraphQL querying from JavaScript applications or the CLI
* [Comunica SPARQL File](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql-file#readme): Library to query over local RDF files
* [Comunica SPARQL RDFJS](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql-rdfjs#readme): Library to query over in-memory [RDFJS-compliant sources](https://rdf.js.org/stream-spec/#source-interface).
* [Comunica SPARQL HDT](https://github.com/comunica/comunica-actor-init-sparql-hdt#readme): Library to query over local HDT files

This repository should be used by Comunica module **developers** as it contains multiple Comunica modules that can be composed.
This repository is managed as a [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md)
using [Lerna](https://lernajs.io/).

More usage information and details can be found in our [manual](http://comunica.readthedocs.io/en/latest/).
Some examples illustrating the usage of Comunica can be found in our dedicated [examples repository](https://github.com/comunica/examples).
If you want more background information about the motivations of this work,
be sure to have a look at our [article](https://comunica.github.io/Article-ISWC2018-Resource/).

Browser scripts of all engines in this repo are automatically built and made available via a CDN:
https://github.com/rdfjs/comunica-browser

## Development Setup

_(JSDoc: https://comunica.github.io/comunica/)_

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

## License
This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
