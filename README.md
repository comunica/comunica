# Comunica

[![Greenkeeper badge](https://badges.greenkeeper.io/comunica/comunica.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/comunica/comunica.svg?branch=master)](https://travis-ci.org/comunica/comunica)
[![Coverage Status](https://coveralls.io/repos/github/comunica/comunica/badge.svg?branch=master)](https://coveralls.io/github/comunica/comunica?branch=master)

This is the repository containing _all_ Comunica modules,
as repo is managed as a [monorepo](https://github.com/babel/babel/blob/master/doc/design/monorepo.md)
using [Lerna](https://lernajs.io/).

Comunica requires Node.js 8.0 or higher and is tested on OSX and Linux.

This repository should be used by Comunica module **developers**.
If you want to **use** Comunica, have a look at the [manual](http://comunica.readthedocs.io/en/latest/).

## Intro

Comunica is a highly modular and flexible query engine platform for the Web.
It's main distinguishing features are the following:

* High modularity enabling easy extensions and customization.
* Federated querying over heterogeneous interfaces
* Can run using [Node.JS](http://nodejs.org/), in the browser, and via the command-line.

## Development Setup

This project can be setup by cloning and installing it as follows:

```bash
$ git clone git@github.com:comunica/comunica
$ cd comunica
$ yarn install
```

This will install the dependencies of all modules, and bootstrap the Lerna monorepo.

Furthermore, this will add [pre-commit hooks](https://www.npmjs.com/package/pre-commit)
to build, lint and test.
These hooks can temporarily be disabled at your own risk by adding the `-n` flag to the commit command.

## License
This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
