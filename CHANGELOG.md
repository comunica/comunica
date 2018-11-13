# Changelog
All notable changes to this project will be documented in this file.

<a name="v1.4.4"></a>
## [v1.4.4](https://github.com/comunica/comunica/compare/v1.4.3...v1.4.4) - 2018-11-13

### Fixed
* [Update to Components.js 3.2.0](https://github.com/comunica/comunica/commit/69ec1caab8a2ffbc99371ae0c9f50ff8c80007b7)
* [Upgrade asynciterator to v2.0.1](https://github.com/comunica/comunica/commit/7a2bda6756ed8701ffc101a36ab19ee21480ed31)

<a name="v1.4.3"></a>
## [v1.4.3](https://github.com/comunica/comunica/compare/v1.4.2...v1.4.3) - 2018-11-09

### Changed
* [Update to generic RDFJS typings](https://github.com/comunica/comunica/commit/dede6abd7768a1c42e2195961930ed766271ab30)
* [Update N3 to 1.0.0, Closes #314](https://github.com/comunica/comunica/commit/f21d548b30d01d99be32e0d168d33737b1d3a33c)

<a name="v1.4.2"></a>
## [v1.4.2](https://github.com/comunica/comunica/compare/v1.4.1...v1.4.2) - 2018-11-05

### Fixed
* [Pass baseIRI to RDF parsers, Closes #311](https://github.com/comunica/comunica/commit/e1dfeb487c387286b3c8900b544d83ea5eca6908)

<a name="v1.4.1"></a>
## [v1.4.1](https://github.com/comunica/comunica/compare/v1.4.0...v1.4.1) - 2018-10-04

### Fixed
* [Make number mediator pick the first when all are invalid](https://github.com/comunica/comunica/commit/9022e419f0a8fd1776d208fe92a61ff12d758073)

<a name="v1.4.0"></a>
## [v1.4.0](https://github.com/comunica/comunica/compare/v1.3.0...v1.4.0) - 2018-10-03

### Added
* [Add MINUS operator actor](https://github.com/comunica/comunica/commit/4fe28defe0d35bd9e18e21518c209cd57141bc19)
* [Add preconfigured prefixes, Closes #80](https://github.com/comunica/comunica/commit/d52f5af96f29530568d76a7595c90cbda5aa37ca)
* [Also check extensions when no valid media type is present, Closes #286](https://github.com/comunica/comunica/commit/58717e45aee9b24974810b21ef255405aa0f7bc0)
* [Make JSON-LD parser accept application/json](https://github.com/comunica/comunica/commit/368c133a75271d3036f45aeb2d08cd32efce491b)
* [Update sparqljson-parse to 1.4.0 with fix for Virtuoso, Closes #278](https://github.com/comunica/comunica/commit/946e30aadd41ceab1b36016137a4ea325ad1283e)

### Fixed
* [Fix federated actor stringifying sources, Closes #265](https://github.com/comunica/comunica/commit/5698508bb21205f14142406102b1c9b0d540d1c0)
* [Fix federation actor occasionally failing to produce results](https://github.com/comunica/comunica/commit/893161fc51cf69520411420b87650af0375c8a2b)
* [Fix crash when passing raw context with GraphQL, Closes #293](https://github.com/comunica/comunica/commit/8e2fafc4e5da5bac158310e0d23907ff550c5334)
* [Fallback to file-based sources when no content type is present, #286](https://github.com/comunica/comunica/commit/c32266913b20d788a3b046dbfd625693792a0e2a)
* [Fix parsing errors with datetime on resources without Memento support](https://github.com/comunica/comunica/commit/12d60e853f64e3c6544e5468897a1e7158d73a5c)

<a name="1.3.0"></a>
## [1.3.0](https://github.com/comunica/comunica/compare/v1.2.2...v1.3.0) - 2018-09-10

### Added
* [Add RDF/XML parser](https://github.com/comunica/comunica/commit/90bb02420b1d12c404221150f63abad0e6fd69ee)
* [Enable serialization in actor-init-sparql-rdfjs](https://github.com/comunica/comunica/commit/aae26f2b339e6a520912a841c1a453b0782f4078)

<a name="1.2.2"></a>
## [1.2.2](https://github.com/comunica/comunica/compare/v1.2.1...v1.2.2) - 2018-09-05

### Fixes

* [Bump sparqljson-to-tree to 1.2.2](https://github.com/comunica/comunica/commit/79daa792c70a5a8dd70867b1b92348a9c8598ff5)

<a name="1.2.1"></a>
## [1.2.1](https://github.com/comunica/comunica/compare/v1.2.0...v1.2.1) - 2018-09-05

### Fixes

* [Bump dependencies with invalid tslib dependency](https://github.com/comunica/comunica/commit/3ffdbf35b8676dcc212dfd4993624b11b3d20ae4)
* [Add missing actor-query-operation-service dependencies](https://github.com/comunica/comunica/commit/f4ddb986837339d8c76db2cfe2e399c2f61bcf3f)
* [Update peer dependency version](https://github.com/comunica/comunica/commit/a9498e0a6d4e532c27093539044346c23b509805)

<a name="1.2.0"></a>
## [1.2.0](https://github.com/comunica/comunica/compare/v1.1.2...v1.2.0) - 2018-09-05

### Added

* [Path expressions](https://github.com/comunica/comunica/commit/fb4dff2d17d2e9dbe3bcf794f8bf6ff02ffd52f1)
* [GraphQL-LD queries](https://github.com/comunica/comunica/commit/f5d2bd305d36d6c6967ffcef43155e923de599ae)
* [Memento support with the `-d` command line option](https://github.com/comunica/comunica/commit/3215d15af5921ac47a11fe8818a5cbea33ff3b12)
* [SERVICE clause](https://github.com/comunica/comunica/commit/ca095f5638ee7dd27ddc700003b11761a73014c4)
* [Dockerfile](https://github.com/comunica/comunica/commit/3ea001785078ec5f7345561b0a9a3c82dc60cbe2)
* [Browser script uploads to rdfjs/comunica-browser](https://github.com/comunica/comunica/commit/ba7bf64a8398030c184d56431482dbddb965b8dd)
* [RDFJS sources](https://github.com/comunica/comunica/commit/8b34fc0fac17d0682961d3acef94bda68039a962)
* [Make browser version of the SPARQL init actor consistent with Node](https://github.com/comunica/comunica/commit/8de84a679e9ca17e2c548d17b677221bf49a2899)
* [Allow initial bindings to be passed to query context](https://github.com/comunica/comunica/commit/c36469dceca5787c40f098fc5597716d9d7ae1b4)
* [Dereferenceable config instances](https://github.com/comunica/comunica/commit/61be07d06cb4a4255c891f52ab77483665585df6)
* [Modularization of configs into config sets](https://github.com/comunica/comunica/commit/18cc15731c83039b66b8d83064d9059b14a3ca55)
* [Action contexts](https://github.com/comunica/comunica/commit/f2183f950c8f80637099607d2ef5d8317f62d44e)
* [Allow actions to be passively observed](https://github.com/comunica/comunica/commit/b9c2c4712f58996ab9b288ce4fa006c0d5375f66)
* [Optimize single SPARQL endpoint sources](https://github.com/comunica/comunica/commit/4252a3d13d2184bbb48af4cd758c57700fd4ecf3)
* [Set user agent for outgoing HTTP requests](https://github.com/comunica/comunica/commit/ef6a2d7677c939d2a9b05782efdca1e0b2cb8529)
* [Add logger](https://github.com/comunica/comunica/commit/99966d551d3310e0b24db61d1477ddfbbd9bb849)
* [Add federated actor to default HDT init config](https://github.com/comunica/comunica/commit/dc1eb514c9286c6019853cba4d26aa66edddada7)

### Fixes

* [Allow pipeline mediator to have no actors in its bus](https://github.com/comunica/comunica/commit/e184182085f9b2c2d222dbe808ddaa63211b9aa4)
* [Accept falsy terms in quad pattern RDF resolvers](https://github.com/comunica/comunica/commit/6a85e75c9ae418ff90889c8258a392b317b1540a)
* [Fix falsy term crash when querying QPF interfaces](https://github.com/comunica/comunica/commit/bb935c1149b0ad40b4ab9631fd11be8701ff69b8)
* [Update asynciterator and follow-redirects to fix termination problems, Closes #144](https://github.com/comunica/comunica/commit/5bf17d49ee075864d8b5c82676ff889c2dcdf1ee)
* [Make empty BGPs return a single empty bindings](https://github.com/comunica/comunica/commit/644853587001f555009cc4e4f7f1200946658f58)

<a name="1.1.2"></a>
## [1.1.2](https://github.com/comunica/comunica/compare/v1.1.1...v1.1.2) - 2018-06-26

### Added

* [Created actor to read local files](https://github.com/comunica/comunica/commit/b878bb722a3a83e3ab5f213a50fc65a8865d81bc)

### Fixes

* [Fix no client-side filtering of non-matching quads, Closes #152](https://github.com/comunica/comunica/commit/3eca72c0950c3425affc0b8620c86c85579e5cdb)
* [Update HDT to 2.x.x](https://github.com/comunica/comunica/commit/5af0f2e34a4e4abf02f296228da5ed0e6b3d0bd5)

<a name="1.1.1"></a>
## [1.1.1](https://github.com/comunica/comunica/compare/v1.1.0...v1.1.1) - 2018-06-01

### Fixes

* [Fix config files missing from some init actor after publication](https://github.com/comunica/comunica/commit/61583dc033ed78be18b0c13a027f9688215b0dab)

<a name="1.1.0"></a>
## [1.1.0](https://github.com/comunica/comunica/compare/v1.0.4...v1.1.0) - 2018-06-01

### Added

* [Add --version flag to command, Closes #118](https://github.com/comunica/comunica/commit/190537231c80500774ce08056afbdb0edca39935)
* [Add Pipeline Combine mediator](https://github.com/comunica/comunica/commit/ed315cb03bf334a8344297cb1080e64aeae58e0c)
* [Add context preprocessing bus](https://github.com/comunica/comunica/commit/5c6d9ef39efebd4e14dd0d570e79013d608f0b58)
* [Add File RDF Source Identifier](https://github.com/comunica/comunica/commit/f9d8f8ad3c9bdac0f7c857bbf217f90471e34a89)
* [Add Hypermedia RDF Source identifier](https://github.com/comunica/comunica/commit/c29ac52cc978a637dcaac8e56b2e8c9e6c2894c7)
* [Add SPARQL RDF Source Identifier](https://github.com/comunica/comunica/commit/8ffee7942b3125485370f9dc595da95e6f816645)
* [Add RDF Source Identifier actor as context preprocessor](https://github.com/comunica/comunica/commit/e9e98b8842b4246c875fe15b66da5f9b8223fb95)
* [Add separate SPARQL init file actor](https://github.com/comunica/comunica/commit/e25628c698694a36e30db67357f6082427966f07)
* [Add separate SPARQL init HDT actor](https://github.com/comunica/comunica/commit/f744b5fff89168ea1b5b7fc1dae2d97dd13218ac)

### Fixes

* [Fix HTTP service not properly recognizing SPARQL POST content types](https://github.com/comunica/comunica/commit/543b1880874bf3a5e802c71b42a7c2f3bdbbbc5c)
* [Make spec-incompliant expression evaluator handle lang() more loosely](https://github.com/comunica/comunica/commit/ad27f5ad7dd9f53db30d5961876233da51b16c7e)
* [Fix ActorHttpNative compilation errors on some platforms](https://github.com/comunica/comunica/commit/d285a55343a4818b200d6a66e9c454b0d120312f)
* [Don't emit null languages in basic expression evaluator](https://github.com/comunica/comunica/commit/de1864ac8912bee140c447804f8f5ac18803e341)
* [Catch engine init errors in HTTP service](https://github.com/comunica/comunica/commit/2c98d948227748c3885d3fdca587221f7d80b0a7)
* [Fix incorrect merge of FROM and FROM NAMED graphs](https://github.com/comunica/comunica/commit/6b2fc0b539e258ff6baa66b9a8bc9a0808473683)
* [Loosen handling of undefineds in expression evaluator](https://github.com/comunica/comunica/commit/e509f1864ea6ef1ccba1612a776a2de357d239f9)
* [Convert blank nodes when resolving SPARQL patterns, Closes #104](https://github.com/comunica/comunica/commit/29a27cf16f6d29ce5cec12204780ff7427f6e4e5)
* [Make N3 parser and serializer forward error events, #103](https://github.com/comunica/comunica/commit/2a4d2e914d85fff3e949982d2c8e6df794c5bc4b)
* [Delegate stream errors from serializers to root, #103](https://github.com/comunica/comunica/commit/74caf16cdd4046548bcd54d7a351a3b9adc21132)
* [Make primary topic actor order-independent and take into account void:subset](https://github.com/comunica/comunica/commit/80b442de226297946f09ab47076dfecbee289384)
* [Fix paged RDF dereferencer not forwarding triples flag](https://github.com/comunica/comunica/commit/8adf51a4d75c236946650767bcc78ece1eeb1d55)
* [Bump Components.js to 2.2.0 to fix config compilation issues on Windows](https://github.com/comunica/comunica/commit/4d200a35213b9eec94746de795c487a88716cc2c)
* [Prevent end event from firing before metadata](https://github.com/comunica/comunica/commit/3af4bcf639ce88ea9cf56068267441566699107c)

<a name="1.0.4"></a>
## [1.0.4](https://github.com/comunica/comunica/compare/v1.0.3...v1.0.4) - 2018-03-22

### Fixes

* [Fix static newQuery function failing](https://github.com/comunica/comunica/commit/302e0913ff48ff82e5711a37af3bb64dec4b2802)

<a name="1.0.3"></a>
## [1.0.3](https://github.com/comunica/comunica/compare/v1.0.2...v1.0.3) - 2018-03-22

### Fixes

* [Catch failure to resolve federated metadata, #117](https://github.com/comunica/comunica/commit/250a851eedfd426659566e245bd0500d27e75f93)

<a name="1.0.2"></a>
## [1.0.2](https://github.com/comunica/comunica/compare/v1.0.1...v1.0.2) - 2018-03-22

### Fixes

* [Fix file quad resolver actor not included as dependency, Closes #120](https://github.com/comunica/comunica/commit/f9332c8c7130407470cf1d33c1348174326164cd)

<a name="1.0.1"></a>
## [1.0.1](https://github.com/comunica/comunica/compare/v1.0.0...v1.0.1) - 2018-03-21

### Fixes

* [Add file quad pattern resolver to default config](https://github.com/comunica/comunica/commit/b780b07495d8bcbf0b642db015d059807ecc9358)

<a name="1.0.0"></a>
## [1.0.0] - 2018-03-19

* Initial release
