# Comunica

[![Greenkeeper badge](https://badges.greenkeeper.io/comunica/comunica.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/comunica/comunica.svg?branch=master)](https://travis-ci.org/comunica/comunica)
[![Coverage Status](https://coveralls.io/repos/github/comunica/comunica/badge.svg?branch=master)](https://coveralls.io/github/comunica/comunica?branch=master)
[![DOI](https://zenodo.org/badge/107345960.svg)](https://zenodo.org/badge/latestdoi/107345960)
[![Gitter chat](https://badges.gitter.im/comunica.png)](https://gitter.im/comunica/Lobby)

Comunica is a highly modular and flexible query engine platform for the Web.

As Comunica is a query engine _platform_,
various configurations can be built for it,
each leading to a different query engine.
One example of such a configuration is [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql),
which is an engine that is preconfigured to execute SPARQL queries over heterogeneous interfaces.

This repository should be used by Comunica module **developers** as it contains multiple Comunica modules that can be composed.
This repository is managed as a [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md)
using [Lerna](https://lernajs.io/).

If you want to **use** Comunica, have a look at the [manual](http://comunica.readthedocs.io/en/latest/)
or at [Comunica SPARQL](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql)
if you want to execute SPARQL queries.

If you want more background information about the motivations of this work,
be sure to have a look at our [article](https://comunica.github.io/Article-ISWC2018-Resource/).

Browser scripts of all engines in this repo are automatically built and made available via a CDN:
https://github.com/rdfjs/comunica-browser

## Development Setup

If you want to develop new features
or use the (potentially unstable) in-development version,
you can set up a development environment for Comunica.

Comunica requires [Node.JS](http://nodejs.org/) 8.0 or higher and the [Yarn](https://yarnpkg.com/en/) package manager.
Comunica is tested on OSX, Linux and Windows.

This project can be setup by cloning and installing it as follows:

```bash
$ git clone git@github.com:comunica/comunica
$ cd comunica
$ yarn install
```

This will install the dependencies of all modules, and bootstrap the Lerna monorepo.
After that, all [Comunica packages](https://github.com/comunica/comunica/tree/master/packages) are available in the `packages/` folder
and can be used in a development environment, such as querying with [Comunica SPARQL (`packages/actor-init-sparql`)](https://github.com/comunica/comunica/tree/master/packages/actor-init-sparql).

Furthermore, this will add [pre-commit hooks](https://www.npmjs.com/package/pre-commit)
to build, lint and test.
These hooks can temporarily be disabled at your own risk by adding the `-n` flag to the commit command.

## License
This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
