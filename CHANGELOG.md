# Changelog
All notable changes to this project will be documented in this file.

<a name="v1.12.0"></a>
## [v1.12.0](https://github.com/comunica/comunica/compare/v1.11.1...v1.12.0) - 2020-04-03

### Changed
* [Update to JSON-LD parser to 1.1](https://github.com/comunica/comunica/commit/cb47af1f3d29629e36c431b481e6752dccdf8227)

### Added
* [Handle JSON-LD via JSON extension types as well](https://github.com/comunica/comunica/commit/ea6da5ea9b392413e701aaa82c611fa3ebad4573)
* [Pass HTTP headers to HTML script parsers](https://github.com/comunica/comunica/commit/1d7b9e7e4fd89d2985735fe5c1b9cb10cb873ee6)
* [Allow HTML scripts to be targeted by id via fragments](https://github.com/comunica/comunica/commit/138a73ed682d01b7b402e721445edfab8ed7c6bc)
* [Throw error on application/json without valid JSON-LD link header](https://github.com/comunica/comunica/commit/42e0999f088ddab271568424bac39143bdc15ecc)

### Fixed
* [Fix HTML parser not forwarding errors within listeners](https://github.com/comunica/comunica/commit/cfdfef2fc6d689afc2b1f91d3b89db385aff3885)

<a name="v1.11.1"></a>
## [v1.11.1](https://github.com/comunica/comunica/compare/v1.11.0...v1.11.1) - 2020-04-02

### Added
* [Add Runner.collectActors method](https://github.com/comunica/comunica/commit/a9a48156a09f10d4aa57ee188f5fa99dc1e842af)

### Fixed
* [Fix initialBindings not applied on full query](https://github.com/comunica/comunica/commit/1e2461bf7300e5c398a41cbc63db65cddd63a27f)

### Changed
* [Output number of HTTP requests in stats serializer](https://github.com/comunica/comunica/commit/52f7a12ac0e99746ce4def9e663166d43bbf037a)
* [Remove unneeded action argument in Setup.instantiateComponent](https://github.com/comunica/comunica/commit/ec48359dd495930fe1a697ffe14fcfae8f3355f8)

<a name="v1.11.0"></a>
## [v1.11.0](https://github.com/comunica/comunica/compare/v1.10.0...v1.11.0) - 2020-03-30

### Added
* [Add more efficient optional actor](https://github.com/comunica/comunica/commit/6b8d0c64250bafaca8399e82c6fa2d32524e950e)
* [Expose SPARQL service description in HTTP tool, Closes #219](https://github.com/comunica/comunica/commit/fe0770c5a6fba235004d8d300957bcdb5f6c3650)

### Changed
* [Optimize default graph handling in QPF sources](https://github.com/comunica/comunica/commit/6d1ac14b52076feb3da737c96fac7d424a691288)
* [Scope blank nodes to each federated source](https://github.com/comunica/comunica/commit/cb7b9b23fc3e7891febad401d26019e23a616cc8)

### Fixed
* [Fix application aborting on some optional queries](https://github.com/comunica/comunica/commit/c7a6d0d7f2ecf28f1e38f142a1245cbaebe19b1c)
* [Use xsd:dateTime format (ISO 8601) for NOW](https://github.com/comunica/comunica/commit/a422b6c1e1e4fd4f2dadea68ad02bfbe06644147)
* Fix several issues with SPARQL endpoints:
    * [Fix crash when slicing construct queries](https://github.com/comunica/comunica/commit/1564acfeea8f199a61122f18cda8e60312b6a163)
    * [Fix only SELECT queries being handleable by SPARQL endpoints](https://github.com/comunica/comunica/commit/0688c7c2dea85550a6da97c1d7222a6026943951)
    * [Fix SPARQL endpoint detection failing when SD uses blank node subjects #619](https://github.com/comunica/comunica/commit/256815fa4d345788ed2007909a6a906790dc30eb)
    * [Fix SPARQL endpoint detection failing for relative IRIs #619](https://github.com/comunica/comunica/commit/8181249107b856327b890d3fa5c4c84bd43613c8)
    * [Consider sources ending with '/sparql' as SPARQL endpoints, Closes #535](https://github.com/comunica/comunica/commit/5c39a00ab3da90bb06c5946c83b93a3fac36f01a)

<a name="v1.10.0"></a>
## [v1.10.0](https://github.com/comunica/comunica/compare/v1.9.4...v1.10.0) - 2019-12-12

### Added
* [Add actors for joining more than two streams pair-wise](https://github.com/comunica/comunica/commit/928b005abd21d43d8c763507c884863cd6c15b16)
* [Allow quad-pattern-level contexts to be defined](https://github.com/comunica/comunica/commit/a672b7db7addc7f64540fa029299b21065d802c6)

### Changed
* [Manually load sources for federated metadata](https://github.com/comunica/comunica/commit/ea35f6b943afff8d14f2dc2ecfd0ca036eac7328)
* [Clarify dereferencing error message.](https://github.com/comunica/comunica/commit/827d51a9fae73c3f8391fdc0d8a1058665af4ddf)

### Fixed
* [Fix unresolved promise rejections in SPARQL tree serialization](https://github.com/comunica/comunica/commit/8ab8624d93d2c3e32eed785148264d29461e9c0b)
* [Swap node-web-streams package with web-streams-node](https://github.com/comunica/comunica/commit/0a3e85ff66acd7f256477ad119fc7c6efdd7a6e0)
* [Remove unused jsonld dependency](https://github.com/comunica/comunica/commit/b01db8677b46c841834a80f81d65db94d861b3aa)

<a name="v1.9.4"></a>
## [v1.9.4](https://github.com/comunica/comunica/compare/v1.9.3...v1.9.4) - 2019-10-21

### Changed
* [Bump to Components.js 3.3.0](https://github.com/comunica/comunica/commit/bfe72612b448e1a143d925be909b4c39921d46e1)

<a name="v1.9.3"></a>
## [v1.9.3](https://github.com/comunica/comunica/compare/v1.9.2...v1.9.3) - 2019-10-16

### Added
* [Add lenient mode for HTTP and parsing errors](https://github.com/comunica/comunica/commit/09903fa9c3ede45c925c85db73e891e3209c40e1)
* [Store currently processing operation in context](https://github.com/comunica/comunica/commit/ef9b1a90138368df2101563e8e9a380c306dc713)
* [Log requesting URLs in node-fetch HTTP actor](https://github.com/comunica/comunica/commit/a6f2792c669633864a7b31f9539ab4541db0a089)

### Changed
* [Tweak priorities of default RDF media types](https://github.com/comunica/comunica/commit/c4cc7f32ee6341c8231c5405b234127efa0b704e)
* [Make hypermedia link following lazy](https://github.com/comunica/comunica/commit/8f955908a043b0cb8e545ad772f692fc8e62610d)
* [Allow headers and method to be passed to RDF dereferencers](https://github.com/comunica/comunica/commit/51f0aa43148928f5a0710ec302d0fe8839340065)
* [Update to Sparqlalgebra.js 2.x.x](https://github.com/comunica/comunica/commit/285e0ee3e4087261c91f0577f1b58208a457ff99)

### Fixed
* [Add missing stream-to-string to actor-rdf-parse-jsonld](https://github.com/comunica/comunica/commit/82a0d86292d0b6c40ba05acb05fa15f58ea519ab)

<a name="v1.9.2"></a>
## [v1.9.2](https://github.com/comunica/comunica/compare/v1.9.1...v1.9.2) - 2019-09-27

### Added
* [Plug HTTP bus into JSON-LD parser, Closes #478](https://github.com/comunica/comunica/commit/bb9f1f32a7d7e5c15eaf21c670e195419c39b2d4)
* [Detect JSON-LD contexts in link headers, Closes #486](https://github.com/comunica/comunica/commit/0d298327f6ce3b68fe6911c1c617c6cafe5e8231)
* [Throw error when multiple JSON-LD link headers to contexts were detected](https://github.com/comunica/comunica/commit/39a4513679410f3c986d71750a2fc9c871660607)

### Changed
* [Emit missing metadata as null](https://github.com/comunica/comunica/commit/5864ca48e563f33cdc3ff25f3f53481233d1d70d)
* [Remove deprecated util.inspect calls, Closes #488](https://github.com/comunica/comunica/commit/680f8fca0247252c73f789fd4cc61fd88ea39495)

### Fixed
* [Fix QPF sources never going beyond page 2](https://github.com/comunica/comunica/commit/7d5a5aa9ac42c6c63d9a08c0be5132f62dfbc46c)
* [Reimplement MINUS operator to handle variables according to spec](https://github.com/comunica/comunica/commit/b9910dc04e374a619b074e6c958e0806099e1091)
* [Ensure unique blank nodes across different bindings](https://github.com/comunica/comunica/commit/be3e47fbcd68d374c5b36c4d94a2882ab5bca7c0)
* [Fix sequence path operator actor missing a join mediator](https://github.com/comunica/comunica/commit/89919d6d19e3673386320f0d09b62a6bca2e1b41)
* [Filter quads from quad patterns with shared variables](https://github.com/comunica/comunica/commit/c4cb77e697eab81b5e20e5609f67a1c2f4242bda)
* [Fix SPARQL BASE not propagating through operators](https://github.com/comunica/comunica/commit/5465821973790d9986e9cf270c0e66d21b2ce865)
* [Fix actor-init-sparql bin being broken, Closes #493](https://github.com/comunica/comunica/commit/aff933d95d919f5da4deffe82807adf50f78fd78)
* [Fix various small Components.js naming issues](https://github.com/comunica/comunica/commit/3a9160199493a0aaf2f229809386868107bb3d88)
* [Update sparqlee to 1.2.0 to fix precision errors in basic arithmetics](https://github.com/comunica/comunica/commit/3937c4f5ef81ffce98bd1d66c4d3561f0ffc92b1)

<a name="v1.9.1"></a>
## [v1.9.1](https://github.com/comunica/comunica/compare/v1.9.0...v1.9.1) - 2019-07-30

### Fixed
* [Fix file source not emitting metadata, resulting in slow queries](https://github.com/comunica/comunica/commit/67db04a8f7f028b6bb18302377fb384b94e9a271)
* [Fix crash due to missing version bump in rdf-terms](https://github.com/comunica/comunica/commit/ae3f0c2e4e6e6085b80465e8f406b1e7c6661439)

<a name="v1.9.0"></a>
## [v1.9.0](https://github.com/comunica/comunica/compare/v1.8.0...v1.9.0) - 2019-07-29

### Added
* [Add HTML script tag parser](https://github.com/comunica/comunica/commit/bc652ea6fc1ff752aad4ef0ae5e8c33934814b1b)
* [Plug RDFa parse into HTML parsing bus, Closes #138](https://github.com/comunica/comunica/commit/c9e6bbc9c1b97ed26225e9735a6be2d5e2a1fa52)
* [Add RDF RDFa parser for XML documents](https://github.com/comunica/comunica/commit/560e110b9f5e87ebcb0fb0cfd28a23a420071b71)
* [Add HTTP proxy actor, Closes #465](https://github.com/comunica/comunica/commit/b1331f7d796c700643e4b151e5845697717588e2)
* [Allow actors to be registered before other actors in buses](https://github.com/comunica/comunica/commit/071aeb93dd3270fc25fd705d16f8b2eca10160e9)
* [Add abstract GraphQL-LD-based hypermedia extractor](https://github.com/comunica/comunica/commit/36c7b695266d87cf79ae84ed0886661834a35801)
* [Add query-based metadata extractors, Closes #115](https://github.com/comunica/comunica/commit/65691f82cd30ec093f6236c46f213f4056f34128)
* [Add BusIndexed that indexes actors by type](https://github.com/comunica/comunica/commit/9e49a9ab858f50cc41dd4c34c4a1a6bb812efe56)

### Fixed
* [Fix broken docker images, Closes #469](https://github.com/comunica/comunica/commit/eb308d5fdf5ead9bce0169c38776f9fb773aa56b)
* [Fix hashing breaking with different data factories, #438](https://github.com/comunica/comunica/commit/921dbf74236b9397cdbb3fee6f21a86ae1bc2046)
* [Fix GraphQL-LD query results not singularizing](https://github.com/comunica/comunica/commit/9a96b46b1dbdf9f286fcfc4492a9d3976c76a8de)
* [Fix RDF dereferencing not taking into account relative response URLs](https://github.com/comunica/comunica/commit/476b66f2dc0512fd13f15f2609f5ccd08dbd6bbc)

### Changed
* [Add RDFJS source actor to default SPARQL config](https://github.com/comunica/comunica/commit/dd1f6e754c9cedfffc5c2d70be25bd6fd7dd7db8)
* [Bump sparqlee to 1.1.0, Closes #477](https://github.com/comunica/comunica/commit/81440eb2d007f558048056bbbd9cf5b6f27af698)
* [Allow auto-sources to be defined as strings instead of objects](https://github.com/comunica/comunica/commit/21725d660406f49ec473afc4c770013ff830cfab)
* [Add hypermedia-based SPARQL resolver using service descriptions](https://github.com/comunica/comunica/commit/3e5b09dbb93c6ea004d0f51f2fff750676cdfcdd)
* [Log identified source](https://github.com/comunica/comunica/commit/e2a1c28da190437ad2adce6448bfa76671b5835c)
* [Improve error message on RDF dereference HTTP errors](https://github.com/comunica/comunica/commit/d1f641b3a8d16b1eeddd6723af975c60140eb764)
* [Allow combine union mediator to have an empty bus](https://github.com/comunica/comunica/commit/2b9d263e76f064cb1169fc0e3b1948bd8a15a7a6)
* [Pass headers to RDF parse actors](https://github.com/comunica/comunica/commit/cf2dec03b5263a2edd113affb77cf5ebf71ffa6d)
* [Append '*/*' in accept header when shortened, Closes #471](https://github.com/comunica/comunica/commit/53c7e7519f6125054ac5e80c79ca4b038f067a18)
* [Deprecate triple predicate metadata identifier](https://github.com/comunica/comunica/commit/05e54cc2b1dd2509ebe8c46667a7cff4ac632e49)
* [Add config option to allow metadata to also be emitted as data](https://github.com/comunica/comunica/commit/a2426b7e9712305b6417455174f3584a661e3683)
* [Add fallback metadata actor that sees everything as both meta and data](https://github.com/comunica/comunica/commit/f44345e3c05e3b76685badf059dbdcbaa746a467)
* [Make primary topic actor fallback to 'all data is also metadata'](https://github.com/comunica/comunica/commit/34f4a98a02ae19bc5fc7e1d6d176953d66c1ba03)
* [Remove heuristical source identification](https://github.com/comunica/comunica/commit/8c67d4518f22ede696ee21e1d07fc072b660ca0e)
* [Emit dataset id in Hydra controls extractor](https://github.com/comunica/comunica/commit/6d41e3be57b7e0bb54b8ee141afbb04fec499a9c)
* [Rewrite quad pattern hypermedia resolver to be less restrictive](https://github.com/comunica/comunica/commit/fc6bbac3a78e663c35ebbbdd3d925e2a6d695bc0)
* [Add hypermedia resolver for unknown sources](https://github.com/comunica/comunica/commit/9c700899553e1fb8ee32eeff46ca1280a1db1797)
* [Refactor QPF-specific hypermedia resolver, #432](https://github.com/comunica/comunica/commit/a72bdf28a0316b57bb273b522dad51fd16344bda)
* [Remove lodash.map from mediators](https://github.com/comunica/comunica/commit/2b91c72b75f2a68960b33e864ef8f69526d1ab61)
* [Improve performance of applyInitialBindings](https://github.com/comunica/comunica/commit/1c37c6237bb28e574d7d8c5f9f0c02c7b6135b66)
* [Index the query operation bus](https://github.com/comunica/comunica/commit/62d083c517aa5f26b0dada4c7c42e6e9ba47f850)
* [Remove unneeded string trimming in SPARQL serialization](https://github.com/comunica/comunica/commit/2fccc31610ba7b06bd424cae315d47ea1504bd61)

<a name="v1.8.0"></a>
## [v1.8.0](https://github.com/comunica/comunica/compare/v1.7.4...v1.8.0) - 2019-06-13

### Changed
* [Update sparqlee to 1.0.0](https://github.com/comunica/comunica/commit/8d91e89cf8a900b8c8f60f0a0a418ad4b742b439)
* [Bump to new GraphQL-LD version](https://github.com/comunica/comunica/commit/3ad1864c0c253a055f3e2f65f043c8fd34cc7329)

<a name="v1.7.4"></a>
## [v1.7.4](https://github.com/comunica/comunica/compare/v1.7.3...v1.7.4) - 2019-05-29

### Fixed
* [Fix RDF source identifier joining content types incorrectly](https://github.com/comunica/comunica/commit/7c7c2a1aac8c3e5f170875e2abd6030ff1f7974e)
* [Allow JSON-LD context to appear out-of-order](https://github.com/comunica/comunica/commit/2b4aa85885161f9def16828348b2537c60dd359e)

<a name="v1.7.3"></a>
## [v1.7.3](https://github.com/comunica/comunica/compare/v1.7.2...v1.7.3) - 2019-05-09

### Fixed
* [Fix bnodes in CONSTRUCT not working, Closes #449](https://github.com/comunica/comunica/commit/f13af0c99d811beb878ff793a8e64043ddb3a86d)
* [Fix CONSTRUCT on empty WHERE clause producing no 1 result, Closes #448](https://github.com/comunica/comunica/commit/614576a2e397bddd804e38c589f4d03c64f6d6de)

<a name="v1.7.2"></a>
## [v1.7.2](https://github.com/comunica/comunica/compare/v1.7.1...v1.7.2) - 2019-05-03

### Fixed
* [Remove console.log in HTTP parse RDF dereference actor](https://github.com/comunica/comunica/commit/17fa2bf863d0bf03ceb5e15f94c835df392cf9a8)

<a name="v1.7.1"></a>
## [v1.7.1](https://github.com/comunica/comunica/compare/v1.7.0...v1.7.1) - 2019-05-03

### Fixed
* [Restrict accept headers to 128 characters in browsers to fix CORS issues](https://github.com/comunica/comunica/commit/776cc210edfc1ff693748910081ed84a6c4f4513)
* [Fix native HTTP actor not forwarding request errors, Closes #381](https://github.com/comunica/comunica/commit/e89aa1d2af29c4cd75c79fe1e40e53737116c7e9)

### Changed
* [Rescale default media type priorities](https://github.com/comunica/comunica/commit/6a16d9b7b1bdf36ec725f2956fd06732706d4388)
* [Remove unneeded spaces and zeros in accept headers](https://github.com/comunica/comunica/commit/6248d906cc634e52f50a5cae15da5d703ff638d5)
* [Add CORS headers for SPARQL interface](https://github.com/comunica/comunica/commit/bc62dd66ffcb90082157239c722cdf051ebea0f0)

<a name="v1.7.0"></a>
## [v1.7.0](https://github.com/comunica/comunica/compare/v1.6.6...v1.7.0) - 2019-04-11

### Added
* [Allow expressions in EXISTS](https://github.com/comunica/comunica/commit/b2182f7f21a7a8389cd70deb8ed1d135259a7f02)
* [Add support for SPARQL aggragates](https://github.com/comunica/comunica/commit/e90e2106d5282a6a09bc96391af9826a6e9edebb)
* [Allow baseIRI to be defined for queries](https://github.com/comunica/comunica/commit/97e3ea1c94c8bd1b9abe73dc1cf4ebcdc31e19d3)

### Fixed
* [Fix local file querying not working](https://github.com/comunica/comunica/commit/19d03f6271d0a84f664b3ae9b8285b5feabf4c05)

<a name="v1.6.6"></a>
## [v1.6.6](https://github.com/comunica/comunica/compare/v1.6.5...v1.6.6) - 2019-04-03

### Changed
* [Remove jsonld.js in favor of streaming JSON-LD processing, Closes #384](https://github.com/comunica/comunica/commit/f93753e93f2bc739fb3b475cafbbbd81665ee861)
* [Use real-world endpoint examples in query help message](https://github.com/comunica/comunica/commit/e4c3703080c1916578007e6ef190c8204a22edd2)
* [Return error code when config compilation failed, Closes #394](https://github.com/comunica/comunica/commit/706aa0b6bcd4384c0b9e3d5888bc4f7faad48d0c)
* [Make SPARQL endpoint identifier use GET instead of HEAD](https://github.com/comunica/comunica/commit/d6547c81238580869faece5843e83611d85d6a8d)
* [Lower default tree serialization priority](https://github.com/comunica/comunica/commit/812faddb2f1797e7d6aaa4fb9151178abf183cad)

### Fixed
* [Fix bug in orderby due to multiple transforms on same stream, Closes #434](https://github.com/comunica/comunica/commit/87f8121980e67a21749eeda11607cd13c5fa4fac)
* [Fix URL hashes not being stripped when doing HTTP requests, Closes #277](https://github.com/comunica/comunica/commit/8f121c0f73bc6ddc95437876fc67108e1c38ec58)
* [Fix invalid default REDUCED cache size, Closes #376](https://github.com/comunica/comunica/commit/70bc5b15aba91cc3fc92b66c48d38292c24961b4)
* [Fix HEAD requests on HTTP service not working, Closes #417](https://github.com/comunica/comunica/commit/2038945856d24724dc7b3acfe93ac5ff48f44551)
* [Fix patterns with conflicting variables being created in federation](https://github.com/comunica/comunica/commit/2ebef4328a912fdcfaafbd11a667fb89977b8768)

<a name="v1.6.5"></a>
## [v1.6.5](https://github.com/comunica/comunica/compare/v1.6.4...v1.6.5) - 2019-03-15

### Added
* [Emit bound pattern metadata in BGP subcontexts](https://github.com/comunica/comunica/commit/ddb5af7f7d0e57177c3a9cc0851d91e77e17405b)

### Fixed
* [Fix invalid expression actor test functions](https://github.com/comunica/comunica/commit/bc7654a5db7068c11af0063b294e4687000fa087)

<a name="v1.6.4"></a>
## [v1.6.4](https://github.com/comunica/comunica/compare/v1.6.3...v1.6.4) - 2019-03-05

### Fixed
* [Fix HTTP service imports](https://github.com/comunica/comunica/commit/d199daa344679a1564b5c0274f75f641d9fb1249)

<a name="v1.6.3"></a>
## [v1.6.3](https://github.com/comunica/comunica/compare/v1.6.2...v1.6.3) - 2019-02-27

### Changed
* [Fix performance issue due to many Error instantiations](https://github.com/comunica/comunica/commit/a185d795520afc1aa829855da423aba0680e6dbd)
* [Disable empty sources check in federated actor](https://github.com/comunica/comunica/commit/d0dfb35091c176f4d9dd5bd2b3f58ae876221b69)

<a name="v1.6.2"></a>
## [v1.6.2](https://github.com/comunica/comunica/compare/v1.6.1...v1.6.2) - 2019-02-26

### Added
* [Add option to invalidate cache before each query exec](https://github.com/comunica/comunica/commit/5cec61c6b5ca51e095d65baac40933b9baf4cfb5)

### Changed
* [Improve help message of HTTP tool](https://github.com/comunica/comunica/commit/44c7f8f8c10d438f0d3d206aa362a6acdb9484ea)

<a name="v1.6.1"></a>
## [v1.6.1](https://github.com/comunica/comunica/compare/v1.6.0...v1.6.1) - 2019-02-25

### Fixed
* [Fix http tool not working with absolute config paths](https://github.com/comunica/comunica/commit/6bfcbfa3a10014232c1b529790bffbd2ba81476e)

<a name="v1.6.0"></a>
## [v1.6.0](https://github.com/comunica/comunica/compare/v1.5.4...v1.6.0) - 2019-02-22

### Added
* [Expose invalidateHttpCache method on SPARQL init](https://github.com/comunica/comunica/commit/f8b218323d2aa66bfc94c7ee290f8fef6a1ac868)
* [Support source identification for single sources](https://github.com/comunica/comunica/commit/4594d9b1102c847173e05795edb6154a3d0787e7)
* [Pass parent metadata to BGP and pattern actions](https://github.com/comunica/comunica/commit/c5f1e7c3f09dd0e746855ef73eafceedf1eb202a)

### Changed
* [Update sparqlee to version 0.1.0, improves FILTER expressivity](https://github.com/comunica/comunica/commit/938884977697931091867bca817890c6bb77c8ba)
* [Use LRU cache in file resolver](https://github.com/comunica/comunica/commit/87651bf388d55b684c3a198c170636d0f8b9c88f)
* [Abstract SPARQL HTTP service](https://github.com/comunica/comunica/commit/5c2a9647704eddba7c4b6baae9b287200ed232b9)

### Fixed
* [Fix config compilation issues in file init actor](https://github.com/comunica/comunica/commit/f30474d583e51a1b90a6dd2bfb2b5d8af0440df3)
* [Fix parser/serializer priority values not being applied](https://github.com/comunica/comunica/commit/cf8bad54bb2fba5a97ee57cdec7fa477a9683720)
* [Fix not all media types being determined in RDF dereference, Closes #318](https://github.com/comunica/comunica/commit/e0c2f18216049c64762e76d617a7c2aef52deedb)
* [Fix invalid unscoped JSON-LD objects](https://github.com/comunica/comunica/commit/69d1810b285b42bd2a153e7fde703114ed7c460f)

<a name="v1.5.4"></a>
## [v1.5.4](https://github.com/comunica/comunica/compare/v1.5.3...v1.5.4) - 2019-01-31

### Fixed
* [Fix newEngineDynamic failing to produce results after multiple calls](https://github.com/comunica/comunica/commit/6531a962e0fbd519a5f7ff3c8055db7e64748668)
* [Fix http tool not working with absolute config paths](https://github.com/comunica/comunica/commit/97c03fd25dd152c02831a1a727f7b2598bc976da)

## Changed
* [Update jsonld to 1.5.0](https://github.com/comunica/comunica/commit/76ebd19c31e94bddbf0875454881244e52b9bcb7)

<a name="v1.5.3"></a>
## [v1.5.3](https://github.com/comunica/comunica/compare/v1.5.2...v1.5.3) - 2019-01-24

### Fixed
* [Fix GraphQL-LD queries not producing results anymore](https://github.com/comunica/comunica/commit/3d923a8204e9daf37ed47d378c778fc936601faa)
* [Fix schema and skos prefix](https://github.com/comunica/comunica/commit/f25b0d6e8abdec1307b7b7326b7ea233ffd75299)

<a name="v1.5.2"></a>
## [v1.5.2](https://github.com/comunica/comunica/compare/v1.5.1...v1.5.2) - 2019-01-17

### Fixed
* [Fix extend operator still depending on old sparqlee version](https://github.com/comunica/comunica/commit/51aad9e802ed9da32f25cd7d08510072628c94c9)

<a name="v1.5.1"></a>
## [v1.5.1](https://github.com/comunica/comunica/compare/v1.5.0...v1.5.1) - 2019-01-17

### Fixed
* [Fix tslib dependency issue in sparqlee, causing a crash at startup](https://github.com/comunica/comunica/commit/33768c2ef38dc74d0fc41277847e3a642d53c98d)
* [Fix JSON-LD serializer producing invalid JSON](https://github.com/comunica/comunica/commit/84ec23e624b92d778318cdad8c63f8cd15936f4b)
* [Check HTTP stream type when identifying source](https://github.com/comunica/comunica/commit/4e138c74e33393ba6f5aab9cfd5522b521eec20b)
* [Remove unneeded filter peer dependency from orderby actor](https://github.com/comunica/comunica/commit/5287c2bb2a966bb653ec64830464849773801451)
* [Remove unneeded @types/bluebird dependency, Closes #360](https://github.com/comunica/comunica/commit/6c647b0316a9d3791b161444e029a35da1f09130)

<a name="v1.5.0"></a>
## [v1.5.0](https://github.com/comunica/comunica/compare/v1.4.6...v1.5.0) - 2019-01-02

### Added
* [Add Filter operator (based on Sparqlee)](https://github.com/comunica/comunica/commit/780460106489f9dab78f88cf0c730a8d9ac48498)
* [Add Extend operator (based on Sparqlee)](https://github.com/comunica/comunica/commit/f606ef2c86ee8fe6372027c6ac3067d7933a7a62)
* [Update LeftJoin NestedLoop actor to use Sparqlee](https://github.com/comunica/comunica/commit/f785d270a479274660fddc122680d13098d22bae)
* [Add BGP join optimizer, Closes #90](https://github.com/comunica/comunica/commit/5f799cacf76e5bd3f2d464a2454aeed95d4cb71f)
* [Add query operation optimize bus](https://github.com/comunica/comunica/commit/72e8cf4ea5df44c43ed9cd21fd8e7892e2505d44)

<a name="v1.4.6"></a>
## [v1.4.6](https://github.com/comunica/comunica/compare/v1.4.5...v1.4.6) - 2018-12-11

### Fixed
* [Fix missing dependencies between new hypermedia actors](https://github.com/comunica/comunica/commit/806f11aaf95fed4d4150b7e791da1f338d44da23)

<a name="v1.4.5"></a>
## [v1.4.5](https://github.com/comunica/comunica/compare/v1.4.4...v1.4.5) - 2018-12-11

### Fixed
* [Fix blank nodes in data being seen as variables](https://github.com/comunica/comunica/commit/04edbe462c8962cbd198a9643664a5718d21b9c2)
* [Fix queries with a variable graph only matching the default graph](https://github.com/comunica/comunica/commit/c0d9ea47e86124fd78d6e48574fb7dadcd4dfda2)
* [Fix missing base IRI in JSON-LD parser, Closes #342](https://github.com/comunica/comunica/commit/b9562cc53d7597ce89f33374de4c28785599d134)

### Changed
* [Split resolve quad pattern actor into two separate modules](https://github.com/comunica/comunica/commit/08e300e598cc173ad81fc383f7a441e16e7f5309)

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
