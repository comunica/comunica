# Changelog
All notable changes to this project will be documented in this file.

<a name="v2.9.0"></a>
## [v2.9.0](https://github.com/comunica/comunica/compare/v2.8.3...v2.9.0) - 2023-09-07

### Changed
* [Early close/destroy in hypermedia iterator when aggregatedStore is unused](https://github.com/comunica/comunica/commit/6560e4764b57734fe099ca4a2b739a097e94735b)
* [Update dependency uuid to v9 (#1247)](https://github.com/comunica/comunica/commit/8d7bc5a44054cc98d60fbcea6b0d524d63ae5df8)
* [Migrate sparqlee into Comunica](https://github.com/comunica/comunica/commit/76685e59cf6615fc2144c197a338ede8851525eb)

### Fixed
* [Enable SPARQL-star for update queries to endpoints](https://github.com/comunica/comunica/commit/01ed03e98e27a72c0077c17d634df4165692eda4)

<a name="v2.8.3"></a>
## [v2.8.3](https://github.com/comunica/comunica/compare/v2.8.2...v2.8.3) - 2023-08-21

### Changed
* [Throw when doing BIND on a pre-bound variable, Closes #1229](https://github.com/comunica/comunica/commit/cb9f0a9c90c0586d2149b02dac7a5e63c4bbcd80)
* [Include final SPARQL endpoint URL in debug logger](https://github.com/comunica/comunica/commit/aa392165f18012e518773a9479b0033fcb605005)

### Fixed
* [Fix hypermedia errors being voided, Closes #1241](https://github.com/comunica/comunica/commit/13e75b9a918b530a7e4d9f26322d020241e9a542)
* [Fix some SPARQL endpoint errors being voided](https://github.com/comunica/comunica/commit/fb42092caf9ea52ae4e8713fdb412d8bdcd397a4)
* [Fix missing end event for empty queries with limit](https://github.com/comunica/comunica/commit/3a35163546698575f63760907dc1de4a5f7d3e88)
* [Fix process halt when re-executing query over erroring source](https://github.com/comunica/comunica/commit/159ea078ea760d6e58eda2733a700db8bfa0d2a1)

<a name="v2.8.2"></a>
## [v2.8.2](https://github.com/comunica/comunica/compare/v2.8.1...v2.8.2) - 2023-08-10

### Fixed
* [Fix aggregated store not containing first source after query re-exec](https://github.com/comunica/comunica/commit/e288e461867397606500b3f09189a25c6410894e)

<a name="v2.8.1"></a>
## [v2.8.1](https://github.com/comunica/comunica/compare/v2.8.0...v2.8.1) - 2023-07-14

### Fixed
* [Allow multi join actors to handle undefs, Closes #1231](https://github.com/comunica/comunica/commit/89d5f3d2d4de18035f0177a89f35db1e28108219)
* [Fix process halting on many TPF sources](https://github.com/comunica/comunica/commit/492f899120a01cbbfd7f502881f992b8fd288f4c)

<a name="v2.8.0"></a>
## [v2.8.0](https://github.com/comunica/comunica/compare/v2.7.1...v2.8.0) - 2023-07-04

### Added
* Add support for RDF-star and SPARQL-star
  * [Support quoted triples in result serializers](https://github.com/comunica/comunica/commit/5b66b377bb65fcaf69edc989314ccc98cbdd37b6)
  * [Add support for processing quoted triples](https://github.com/comunica/comunica/commit/1ab23621292de1c3dccd6c550001944cf39d5947)

### Changed
* [Update to rdf-store-stream v2](https://github.com/comunica/comunica/commit/7d35453063b970f473631238d81459209191cb14)
* [Update dependency lru-cache to v10](https://github.com/comunica/comunica/commit/5bf6a195bb809dbd748579a44c5c2c090280597d)
* [Update to TypeScript 5.x](https://github.com/comunica/comunica/commit/1874c40f156f27d8aa566ac383e5541f8e8b54d8)

<a name="v2.7.1"></a>
## [v2.7.1](https://github.com/comunica/comunica/compare/v2.7.0...v2.7.1) - 2023-05-31

### Changed
* [Update dependency htmlparser2 to v9 (#1211)](https://github.com/comunica/comunica/commit/8e2fd93f26ffccee1ce243bf2d4378b845231c33)
* [Simplify stringSource actor implementation](https://github.com/comunica/comunica/commit/1ab4d002763c1bb5a40c47ad6be7ead07729a37e)

### Fixed
* [Fix existence hook not provided error with OPTIONAL, Closes #1029](https://github.com/comunica/comunica/commit/fd0c311584b17d11d4eeeaf73a579d5df33931d8)
* [Fix stringSource syntax errors not being caught, Closes #1192](https://github.com/comunica/comunica/commit/15e9c6c246d5da2d337d6320caeeb11d7ea4b8e2)
* [Fix bind join illegally being used over FILTERs](https://github.com/comunica/comunica/commit/afaa05962ec72202fec8fbc656fb435088e2999a)
* [Fix NaN selectivity for non-pattern operations](https://github.com/comunica/comunica/commit/6984a5af1a01131a4c9855483a6192fb7217d0d5)

<a name="v2.7.0"></a>
## [v2.7.0](https://github.com/comunica/comunica/compare/v2.6.10...v2.7.0) - 2023-05-24

### Added
* [Support durations, dates, and times in filters](https://github.com/comunica/comunica/commit/9788c434c9d6496746733f37856046b0ac0bc124)
* [Add support for ZeroOrOne path expressions with 2 variables](https://github.com/comunica/comunica/commit/1d63300d3dbaac03619c5211973d56c8b45c8dfd)

### Changed
* Improving Web support
  * [Use process shim (#1186)](https://github.com/comunica/comunica/commit/e5a1f634e712989edaf4ea2d698e1eae25339b7a)
* Improve performance with SPARQL endpoints
  * [Improve metadata and lazyness in SPARQL hypermedia actor](https://github.com/comunica/comunica/commit/acbc510d9ff2de8a5b6eb79d4a3f430ca00efa42)
  * [Fix SPARQL endpoint operator always having canContainUndefs: true](https://github.com/comunica/comunica/commit/71e7048cc01af2ab300bd1b4622d19bfd9677bbc)
  * [Fix keepalive not being true in fetch-only environments](https://github.com/comunica/comunica/commit/30aa52b8308178f4a86a9a3f7d1c465a6c11ba5b)
  * [Cache count queries over SPARQL endpoints](https://github.com/comunica/comunica/commit/87f08d6b265def4660f6089879b8795748dcef01)
* [Enable incremental metadata updates](https://github.com/comunica/comunica/commit/f9065487cd94ecff6b9406833a18d313d766ca6f)
* [Update dependency canonicalize to v2](https://github.com/comunica/comunica/commit/5407a718dc97b167267f4baf2829b3ed7551471d)
* [Make Bindings#merge and mergeWith accept more generic RDF.Bindings](https://github.com/comunica/comunica/commit/2b025b651710c9f4a06614f961886cde361d5dbf)

### Fixed
* [Fix blank node scoping in CONSTRUCT queries, Closes #1190](https://github.com/comunica/comunica/commit/c594462a84e13cb581d219ef77394efcd2c021f2)
* [Add missing baseIRI for shaclc](https://github.com/comunica/comunica/commit/a4c0053ad11a22e51489f3262a352992095b8372)
* [Destroy unused iterators](https://github.com/comunica/comunica/commit/712b71c451ff9bbbd15cb467a7d0f5b6577c0946)

<a name="v2.6.10"></a>
## [v2.6.10](https://github.com/comunica/comunica/compare/v2.6.9...v2.6.10) - 2023-03-10

### Fixed
* [Add missing shaclc dependency in rdfjs engine](https://github.com/comunica/comunica/commit/f912ea313d9c72e7883e462ff66aac778cac6936)

<a name="v2.6.9"></a>
## [v2.6.9](https://github.com/comunica/comunica/compare/v2.6.8...v2.6.9) - 2023-03-08

### Changed
* [Update to Node.js typings v18](https://github.com/comunica/comunica/commit/227c71ca94d8bcf2b63ad5002f2b442be2a1fca0)

### Fixed
* [Bump rdf-streaming-store with another fix for stream.push() after EOF](https://github.com/comunica/comunica/commit/6889b5dcb4be3ea849ca3830f5b1d7011a33f429)
* [Use globalThis instead of global](https://github.com/comunica/comunica/commit/a5ee4208372c8f949988fb83324c7b190d3caac4)
* [Fix OPTIONAL failing to emit FILTERed results](https://github.com/comunica/comunica/commit/23f78cace357eb1a023bf00466a990dfe27afff1)

<a name="v2.6.8"></a>
## [v2.6.8](https://github.com/comunica/comunica/compare/v2.6.7...v2.6.8) - 2023-03-06

### Changed
* [Remove deprecated calls to lru-cache](https://github.com/comunica/comunica/commit/20441fc0baab6e167f042c7a555c7a8cab5ccc08)

### Fixed
* [Bump rdf-streaming-store with fix for stream.push() after EOF](https://github.com/comunica/comunica/commit/aeccd872812dee8379f8eefc5153f4ef2fb973fc)
* [Fix aggregated store not ending when linked iterator is destroyed](https://github.com/comunica/comunica/commit/9d1a2780530f3aa2517f3fff81148141cf5c4dac)
* [Scope aggregated stores in the query context](https://github.com/comunica/comunica/commit/c180fc6c67de7aa5650cdc3ba9ecdf202a1f8356)

<a name="v2.6.7"></a>
## [v2.6.7](https://github.com/comunica/comunica/compare/v2.6.6...v2.6.7) - 2023-02-15

### Added
* [Allow minimum sources check on CLI to be disabled](https://github.com/comunica/comunica/commit/5cc10df8a9f48f07e31616c5fddbb4ceb989cdc5)
* [Allow generic context type in QueryEngine to omit fields](https://github.com/comunica/comunica/commit/5f91896401bb2244a0e0b33fddb94ea32d86f438)

<a name="v2.6.6"></a>
## [v2.6.6](https://github.com/comunica/comunica/compare/v2.6.5...v2.6.6) - 2023-02-08

### Fixed
* [Prefer piping in serializers to maintain backpressure, #759](https://github.com/comunica/comunica/commit/7e5470d52489297158ad74624499416add214b3b)

### Changed
* [Update dependency lru-cache to v7](https://github.com/comunica/comunica/commit/ac21be0fdbfcf7c6892b62fa6794b8b436b0a466)
* [Don't lookup default graph when none available in QPF](https://github.com/comunica/comunica/commit/22dc9b99ddbf77b365f29ebf06173c29d0e47334)

<a name="v2.6.5"></a>
## [v2.6.5](https://github.com/comunica/comunica/compare/v2.6.4...v2.6.5) - 2023-02-07

### Fixed
* [Fix group operator only returning stream after completion](https://github.com/comunica/comunica/commit/2f4948e3ad5a0a5287f3afcaa731ad8113f30eaf)
* [Fix incorrect caching of QPF requests on default graph](https://github.com/comunica/comunica/commit/f901b604ecc687b5118360bfef5e6021cae03df7)

<a name="v2.6.4"></a>
## [v2.6.4](https://github.com/comunica/comunica/compare/v2.6.3...v2.6.4) - 2023-02-02

### Fixed
* [Fix aggregated hypermedia store not closing with LIMIT](https://github.com/comunica/comunica/commit/9be52343c02ad8d34971dc250c871fbb6e991c1e)

<a name="v2.6.3"></a>
## [v2.6.3](https://github.com/comunica/comunica/compare/v2.6.2...v2.6.3) - 2023-02-01

### Fixed
* [Fix aggregated hypermedia store halting if initial stream is destroyed](https://github.com/comunica/comunica/commit/587fbf178073b5a56d7e90ed5023f135aa7787d6)

<a name="v2.6.2"></a>
## [v2.6.2](https://github.com/comunica/comunica/compare/v2.6.1...v2.6.2) - 2023-01-31

### Fixed
* [Fix shaclc parser not being able to pipe](https://github.com/comunica/comunica/commit/2b6f38e3cf1446ea59a678ef327934cc74bfe310)

<a name="v2.6.1"></a>
## [v2.6.1](https://github.com/comunica/comunica/compare/v2.6.0...v2.6.1) - 2023-01-30

### Fixed
* [Fix aggregated hypermedia store halting if initial stream not fully consumed](https://github.com/comunica/comunica/commit/14d9938373dd48682e76ef0ef487721d806e617c)
* [Cache parsed sources in string source actor](https://github.com/comunica/comunica/commit/4a0992d5f757c356c2ba6662b8b512c712bdc0c8)

<a name="v2.6.0"></a>
## [v2.6.0](https://github.com/comunica/comunica/compare/v2.5.2...v2.6.0) - 2023-01-26

### Added
* [Add SHACLC parser and serializer](https://github.com/comunica/comunica/commit/38f5499d709f32fc8285ed68c02a72fafe4586ca)
* [Allow hypermedia actor to aggregate link queue in an index](https://github.com/comunica/comunica/commit/dfad5aba52972f5e85debb3452f663c927e7bec5)

### Changed
* [Use sparqlee's new type system](https://github.com/comunica/comunica/commit/cca85ecec92a3cdbdf478d86f3195d96b8f03b2a)

### Fixed
* [Fix invalid baseIRI when querying local files](https://github.com/comunica/comunica/commit/052371323d2dbc061d8dfc2ff4623994906d6c50)
* [Fix errors in Node 19](https://github.com/comunica/comunica/commit/96bdbec53778e821348c928ae0921901a4ffee70)

<a name="v2.5.2"></a>
## [v2.5.2](https://github.com/comunica/comunica/compare/v2.5.1...v2.5.2) - 2022-11-18

### Fixed
* [Fix broken bindingsStreamToGraphQL export](https://github.com/comunica/comunica/commit/3030ed3c1d24a52a80fb61df9c27e7c0861b72b1)
* [Fix incorrect bindingsStreamToGraphQl return type](https://github.com/comunica/comunica/commit/78a203c67882041fa8ca4fd28e78191c659cb1bf)

<a name="v2.5.1"></a>
## [v2.5.1](https://github.com/comunica/comunica/compare/v2.5.0...v2.5.1) - 2022-11-16

### Fixed
* [Add missing dependencies in file and rdfjs engines](https://github.com/comunica/comunica/commit/2261aa801acde5dcdde6597ccce54962284ab0f9)
* [Rename wayback actor in config, Closes #1086](https://github.com/comunica/comunica/commit/4571140d7b51879f6b8896d9103518ad7a006e6c)
* [Add localizeBlankNodes to IQueryContextCommon](https://github.com/comunica/comunica/commit/58d6eafffd4aea99d64631fd95cd6b51748ee2be)
* [Fix incorrect files entry in data-factory](https://github.com/comunica/comunica/commit/bfefa770d8dbd06db9a04f7e76e3d556db2147b9)
* [Add recoverBrokenLinks to IQueryContextCommon](https://github.com/comunica/comunica/commit/84f755c6c12f42db12a9f3f447bdbe90d56a79a5)

<a name="v2.5.0"></a>
## [v2.5.0](https://github.com/comunica/comunica/compare/v2.4.3...v2.5.0) - 2022-11-09

### Added
* [Enable engines to override context shortcuts and typings](https://github.com/comunica/comunica/commit/ca7e6cf64741ec5075673dbef0374c6d033d1b9a)
* [Support string-based data sources, Closes #639](https://github.com/comunica/comunica/commit/af4343054cb3dbbed32296774981d929559a09fa)
* [Add support for HTTP retries](https://github.com/comunica/comunica/commit/d36f0bb2e80bd0c7972b71c19b02fa52f04e772a)
* [Add wayback HTTP actor](https://github.com/comunica/comunica/commit/ad0bbf5ea08fe4cb5cc9e2ce73bd3132eec35a86)

### Changed
* [Add USER to Dockerfile](https://github.com/comunica/comunica/commit/27335fb8acf59c5b9720b7ff4ac4ed31169177d4)
* [Make QueryOperationAsk close the BindingsStream earlier](https://github.com/comunica/comunica/commit/33de86f086bf3be418545f07aa57f44d1461c28b)
* [Expose localizeBlankNodes on the CLI](https://github.com/comunica/comunica/commit/146b41da2135033be72a6342ecf2313b381daff9)

### Fixed
* [Bump to asynciterator 3.8 with ESM packaging fix, Closes #1097](https://github.com/comunica/comunica/commit/24294150a4ad8d0f8b224014e97890bb7310c115)
* [Include source map files in packed files](https://github.com/comunica/comunica/commit/1ddba2b57457ad4a630d4f9a8a30c23955e4f1fc)
* [Fix invalid blank node skolemization in DESCRIBE queries](https://github.com/comunica/comunica/commit/efa0e9192f0a22d242744779f0286228de92959f)

<a name="v2.4.3"></a>
## [v2.4.3](https://github.com/comunica/comunica/compare/v2.4.2...v2.4.3) - 2022-09-06

### Fixed
* [Add workaround for INSERT queries on Solid pods](https://github.com/comunica/comunica/commit/a0133b837ae8503b454bc14cc78896b0cd4d2e2e)
* [Add polyfill for Buffer in webpack](https://github.com/comunica/comunica/commit/4d65094cb5ca407021a5c9d1c18d93d1a56f46c7)

<a name="v2.4.2"></a>
## [v2.4.2](https://github.com/comunica/comunica/compare/v2.4.1...v2.4.2) - 2022-08-26

### Fixed
* [Fix typings issue in ActorDereferenceParse#handleDereferenceStreamErrors](https://github.com/comunica/comunica/commit/2587e9d53c20512ada9c1ca59e942fcb7f777229)

<a name="v2.4.1"></a>
## [v2.4.1](https://github.com/comunica/comunica/compare/v2.4.0...v2.4.1) - 2022-08-24

### Fixed
* [Make global process override conditional](https://github.com/comunica/comunica/commit/cbf47cc0e38294d0fadb244fb9fab7e922db941c)

<a name="v2.4.0"></a>
## [v2.4.0](https://github.com/comunica/comunica/compare/v2.3.0...v2.4.0) - 2022-08-24

### Added
* [Add logging on timeout handlers in HTTP service](https://github.com/comunica/comunica/commit/52728c5ea9e69bbce2bc5d1e363049e2d2f641d2)
* [Emit metadata in SPARQL/JSON serializer](https://github.com/comunica/comunica/commit/4958206f6b042239efe2218ce268e4b981ce9e2c)
* [Enable context overriding when running SPARQL endpoint](https://github.com/comunica/comunica/commit/4dd99fee904c64e9ef700eb5080197c4a03a36fa)

### Changed
* [Move away from Node.js built-ins to avoid polyfilling in tools such as Webpack](https://github.com/comunica/comunica/commit/b84898f73a1a2c1fc413b51b2facacfd6bb729e4)
    * [Replace setImmediate by setTimeout](https://github.com/comunica/comunica/commit/ce52731ffa01962b5955f268bd71e83f0bf404ab)
    * [Use performance.now instead of process.hrtime](https://github.com/comunica/comunica/commit/4ce3659c7d2b36905cf14dd366d99bdb62b4c0a4)
    * [Avoid using htmlparser2 stream feature](https://github.com/comunica/comunica/commit/c18bc6d62e76e2a2f32c7512913a5a0890910402)
    * [Remove xml dependencies](https://github.com/comunica/comunica/commit/1161105a184d82e502ce3dcc229952e09dbd7e46)
    * [Remove dependency on web-streams-node](https://github.com/comunica/comunica/commit/1df323734cd702b67f75fab83f2d2eb2218c4998)
* Performance improvements:
    * [Update to AsyncIterator 3.7.0](https://github.com/comunica/comunica/commit/b16e18888b0e93821c76e01a6efd9bcb3c4f9523)
    * [Rewrite */+ property paths with proper backpressure handling](https://github.com/comunica/comunica/commit/0ad833f8f32f7e3c2de1b22a0424da027656bf6a)

### Fixed
* [Fix propagation of iterator destroying in various places](https://github.com/comunica/comunica/commit/715b8acc122d28d09cbe28c02a1c7b8a7b82d024)
* [Fix blocking operators delaying timeout start in HTTP service](https://github.com/comunica/comunica/commit/a6b2907780c1607eceb10e7f12ef6978f79e4aba)
* [Fix halting when error occurs in extend operation](https://github.com/comunica/comunica/commit/58cfd99cc2d218b5fcf87a67112b3a27df9158eb)
* [Avoid applying @babel/polyfill on the output code](https://github.com/comunica/comunica/commit/58dc932852a28fa757d3d891ac79a61c80c4a6f3)
* [Close connections on uncaught exceptions in HTTP service workers](https://github.com/comunica/comunica/commit/300afb0d1e324dff121acd0fbd24b4eb37e201f5)
* [Kill HTTP service master process if worker was forcefully killed](https://github.com/comunica/comunica/commit/f19ddb3ad0c30fd78c6f808e7152fe22f7a28c6c)

<a name="v2.3.0"></a>
## [v2.3.0](https://github.com/comunica/comunica/compare/v2.2.1...v2.3.0) - 2022-06-29

### Added
* [Add httpTimeout option to timeout on HTTP requests](https://github.com/comunica/comunica/commit/05b170b8c58cb13f81caecb02a1415473b2c19bc)
* [Add httpTimeoutOnBody option](https://github.com/comunica/comunica/commit/c686ae4a246446246454b30d939082f33f65fd02)
* [Add options to run using union default graph semantics](https://github.com/comunica/comunica/commit/b122c1ac9a3382a65812c843727d752ad21d4846)
* [Add freshWorker option to HTTP service](https://github.com/comunica/comunica/commit/35aee16d47d1cded212f4df9d725b6d13f21c54a)

### Changed
* [Improve warning messages in extend actor](https://github.com/comunica/comunica/commit/7db371de8d9f0f4c67836af18c0304f51dbd5199)
* [Properly sort named nodes, blank nodes and unbounded values](https://github.com/comunica/comunica/commit/9ea0b18df152f03fea33f84a12524fd04aa11101)

### Fixed
* [Fix race conditions when timing out in HTTP server](https://github.com/comunica/comunica/commit/3564d288bc76bf51ef0268da6aeecaba1b474bd8)
* [Fix responses not always being sent after HTTP server timeout](https://github.com/comunica/comunica/commit/2b613e5a60a3d7edff541863482646b5f6013a52)
* [Fix closing of streams not always propagating](https://github.com/comunica/comunica/commit/f3a79b04bcf5f96767847cc335145491ccba68ff)
* [Fix N3.js parser not receiving parsing media type](https://github.com/comunica/comunica/commit/6619fdcd3e894c3ee0a8e2907f60ba3153f6674e)
* [Fix physical query plan crash when multi-smallest inner join is used](https://github.com/comunica/comunica/commit/84c3d695d235a53f402dff50c73c878028344b1a)

<a name="v2.2.1"></a>
## [v2.2.1](https://github.com/comunica/comunica/compare/v2.2.0...v2.2.1) - 2022-04-13

### Fixed
* [Fix request with body in browser not working](https://github.com/comunica/comunica/commit/976f1e0206898d28210f5437f0bbfd300ed6dfde)

<a name="v2.2.0"></a>
## [v2.2.0](https://github.com/comunica/comunica/compare/v2.1.0...v2.2.0) - 2022-04-12

### Added
* [Add getSafe to ActionContext and bus convenience interfaces](https://github.com/comunica/comunica/commit/731cde8060796d7430dea339e638a5cf0c9d7e5c)
* [Export deskolimisation functions (#974)](https://github.com/comunica/comunica/commit/fbd6d287a835348558dda1aacf3f8b859b08f08e)

### Changed
* [Require minimum @rdfjs/types version (#948)](https://github.com/comunica/comunica/commit/e7d69320649d0ee42f557c1a2780f6e998ebd93c)
* [Update to arrayify-stream 2](https://github.com/comunica/comunica/commit/276408c6002de53b0af4e66ed724084860a96c83)
* [Update to immutable.js 4](https://github.com/comunica/comunica/commit/6199e753efbe4d5658b5ef9ef500012525f093e3)
* [Add missing deps in bus-dereference](https://github.com/comunica/comunica/commit/448bfbadd805dcad95841789cd12b0d33a672585)

### Fixed
* [Fix invalid JSON in a config file](https://github.com/comunica/comunica/commit/38760ab84898ebcc32e7129a237d95c127c9381d)
* [Fix hash joins not working on queries with limits](https://github.com/comunica/comunica/commit/431233c0f887abe4987482ea4d8c96fdbbf9fb0e)
* [Fix crash for requests with string body, Closes #969](https://github.com/comunica/comunica/commit/6667d669544289f6b48e1bcaedb46163ae469af6)

<a name="v2.1.0"></a>
## [v2.1.0](https://github.com/comunica/comunica/compare/v2.0.6...v2.1.0) - 2022-03-09

### Added
* [Allow links to be followed in parallel](https://github.com/comunica/comunica/commit/9ad64da7bae9dda857e12b7bb0b3af58d5f0f2af)

<a name="v2.0.6"></a>
## [v2.0.6](https://github.com/comunica/comunica/compare/v2.0.5...v2.0.6) - 2022-03-07

### Fixed
* [Remove original query string from context for initialBindings, Closes #941](https://github.com/comunica/comunica/commit/eb48d5abd8a1d29c2aa9280654b76c2a06b6e466)

<a name="v2.0.5"></a>
## [v2.0.5](https://github.com/comunica/comunica/compare/v2.0.4...v2.0.5) - 2022-03-04

### Fixed
* [Fix unhandled parse errors, Closes #872](https://github.com/comunica/comunica/commit/392f81e64bfebd8ded5aac68c61073b28602eb88)

<a name="v2.0.4"></a>
## [v2.0.4](https://github.com/comunica/comunica/compare/v2.0.3...v2.0.4) - 2022-03-04

### Fixed
* [Disable fetch keepalive when sending a body](https://github.com/comunica/comunica/commit/16fa09cf3a4b30554b3a772b83e0007b3ec17911)

<a name="v2.0.3"></a>
## [v2.0.3](https://github.com/comunica/comunica/compare/v2.0.2...v2.0.3) - 2022-03-02

### Fixed
* [Bump deps to avoid old transitive Comunica deps](https://github.com/comunica/comunica/commit/89e3d93b4f0fb72fc0534d3bc00a34121f31a569)

<a name="v2.0.2"></a>
## [v2.0.2](https://github.com/comunica/comunica/compare/v2.0.1...v2.0.2) - 2022-03-02

### Fixed
* [Fix extension-based media type identification not working](https://github.com/comunica/comunica/commit/bac8966bdfcd3ce48503f8c7a37a0150d1166dbf)
* [Fix invalid Dockerfile](https://github.com/comunica/comunica/commit/356d36c3d5907ec7d61f0c781c57be83960425d9)

<a name="v2.0.1"></a>
## [v2.0.1](https://github.com/comunica/comunica/compare/v1.22.3...v2.0.1) - 2022-03-02

### BREAKING CHANGES
* [Set minimum Node version to 14](https://github.com/comunica/comunica/commit/18363c2ce18f0e410c2ed5a571d5a5b274e950ad)
  * [Update tsconfig to es2020](https://github.com/comunica/comunica/commit/5ce4b3e6de6f41304241e46f2a798986ef6cada7)
* Public API
  * [Improve names of query result interfaces](https://github.com/comunica/comunica/commit/d6f2e01a537e3bdfe961a5163d6b6be098fb9887)
  * [Implement new RDF/JS Bindings and BindingsFactory](https://github.com/comunica/comunica/commit/780e4e82234bc5ad807c2e05b236b5b6d135be47)
  * [Rename update results to void results](https://github.com/comunica/comunica/commit/e6ad56c3efd75dfa51a041604b5e243215deec2f)
  * [Implement RDF.Queryable in IQueryEngine](https://github.com/comunica/comunica/commit/afed0f4e302e25e2c90a08526d5fc9795c07cfb7)
  * [Make query context type-safe](https://github.com/comunica/comunica/commit/ba82f35775d7454b321e74d12baa74680703412e)
  * [Represent query formats as RDF.QueryFormat](https://github.com/comunica/comunica/commit/fff4d2ec31b5c5c47a079dbbbad3dcc761aa2f04)
  * [Implement RDF.SparqlQueryable in IQueryEngine](https://github.com/comunica/comunica/commit/b385bff21feb1e9490b32dabff2120317949a0e0)
* Internal API
  * [Make metadata in query operations mandatory and strictly typed](https://github.com/comunica/comunica/commit/576ff98bdaec03094a3749a417e6c16a940b0dda)
  * [Add Mediate utility type, Closes #902](https://github.com/comunica/comunica/commit/2bdd706ea4e58135b62af2601b4c8c006688bc4d)
  * [Make ActionContext type-safe](https://github.com/comunica/comunica/commit/aa206ee718ac27f8c9caa508e321db41f2ca3349)
  * [Make context object required in actions](https://github.com/comunica/comunica/commit/a2af7f742346a8333c5095cbbb138c0fcb0fb608)
  * [Use Headers rather than Record<string, string>](https://github.com/comunica/comunica/commit/5d88d714d1ee710ad781c2a05d89f323ba837011)
  * [Rename IQueryableResult to IQueryOperationResult](https://github.com/comunica/comunica/commit/1df63cc3d692629ef48758f4ebb6bcb9e2a6d9b3)
  * [Make IMediatorTypeJoinCoefficients implement RDF.QueryOperationCost](https://github.com/comunica/comunica/commit/3e42f16a49232dedce3cb19b7bb7d71aa8a2fe34)
  * [Migrate metadata interface to RDF/JS metadata types](https://github.com/comunica/comunica/commit/b701dcab3833264f7c8db23e6f116a898bfd19a0)
  * [Move variables field into metadata](https://github.com/comunica/comunica/commit/1ed479f2980a467fc1f1e993a628f8cf7619d0a3)
  * [Make boolean and void results lazy](https://github.com/comunica/comunica/commit/a5ed9ab9e51e18cc0e6ee9bfffe0af5a4a8ad85b)
* Remove deprecated features
  * [Remove deprecated string variant in links bus output](https://github.com/comunica/comunica/commit/b90c2df62652935b1f9324e9adb83d4e4223df68)
  * [Make links queue mediator in hypermedia resolver mandatory](https://github.com/comunica/comunica/commit/ca671ef8e26ba1767d942e97a2f7288bde6d6496)
  * [Remove backwards-compat for source and hypermedia tagged sources](https://github.com/comunica/comunica/commit/4656bef4e5590bb15cfdb84c84a9563379ac35d2)
  * [Remove deprecated exports](https://github.com/comunica/comunica/commit/bb11387cfb98b1675e281e04ecd12aadc4e5340b)
  * [Remove unused init actors](https://github.com/comunica/comunica/commit/ee6094312db959c72d5d1f0b3c9a76a6fc736112)
  * [Remove deprecated packages](https://github.com/comunica/comunica/commit/373433070090bc91f5d6871126c3357850dbe816)
  * [Remove inefficient query-based metadata extractors](https://github.com/comunica/comunica/commit/08e23e4f33815437717f169555b5a0581a073f65)
  * [Remove utils-datasource package](https://github.com/comunica/comunica/commit/4c7fe5922dd89445983a797661691d3c137d30f7)
  * [Remove bindings and quads methods in favor of toArray on AsyncIterator](https://github.com/comunica/comunica/commit/5abf8fcbd4b431b21bf83ecc88d265fb5a567ff3)
* Restructure packages
  * [Move index files to lib directory](https://github.com/comunica/comunica/commit/0148e0aefe0b33e7219d17ec563ed4a3b102d3af)
  * [Rename actor-rdf-dereference-http-parse to actor-rdf-dereference-http](https://github.com/comunica/comunica/commit/5c02a30add803b3b50925a900c27e32527b1da8d)
  * [Move peerDependencies to dependencies](https://github.com/comunica/comunica/commit/055de6385e1ac1d76d83751af14a07a3e34eb617)
  * [Remove unnecessary entries from package.json files](https://github.com/comunica/comunica/commit/27706de117232901cd5891ada0789edbc0a09531)
  * [Rename bus-sparql-serialize to bus-query-result-serialize](https://github.com/comunica/comunica/commit/78a4a602a30c75b3256c389879afc17fc431e208)
  * [Rename bus-sparql-parse to bus-query-parse](https://github.com/comunica/comunica/commit/56d0e5f47b3cca5e708e8fc183552f2381e87c12)
  * [Rename actor-http-node-fetch to actor-http-fetch](https://github.com/comunica/comunica/commit/f8d6f555c824f856c1f059d6b1c6f38bbe539a8d)
  * [Decouple configs and query engines into separate packages](https://github.com/comunica/comunica/commit/acd03dd99ba086ce9eb94cfbb035fff71016da93)
  * [Add generic dereference bus](https://github.com/comunica/comunica/commit/c585090b3c1bb84ae08628a573a788ed3f87ce85)
  * [Move sorting of join entries to dedicated bus](https://github.com/comunica/comunica/commit/d5e6294077434c2467fc41c78fe3b3c95a0b4733)
  * [Remove args_ prefixes in config files when possible](https://github.com/comunica/comunica/commit/ee9424334704b5db2234f32ea9f40a8aa9b2ba37)
* Refactor join operations:
  * [Add logical join type field to join action](https://github.com/comunica/comunica/commit/67ec6365564ab48ef9155240abaafba15baa0af3)
  * [Add actor to cluster connected join entries](https://github.com/comunica/comunica/commit/a4926410cd177f03ac3886014c8c59cc47e89712)
  * [Consider multiple coefficients during join mediation](https://github.com/comunica/comunica/commit/deee22928453867886ec2f1009f61355d64ecb6c)
  * [Add optimize actor to convert BGPs to joins](https://github.com/comunica/comunica/commit/7202ecb1fb0ca04750be7d5ac8764a5ad1ecab19)
  * [Add cardinality metadata to all property path actors](https://github.com/comunica/comunica/commit/da8e964eeb5f84ff6bb6cd4964ac77640c7078f1)
  * [Rename totalItems metadata to cardinality](https://github.com/comunica/comunica/commit/1c2035d7cc8ad0179fb4251a34557648819dddba)
  * [Remove BGP actors in favor of new join actors](https://github.com/comunica/comunica/commit/4dedb345498c3340b4972cc594d14bdf512ff58d)
  * [Add BGP actor that delegates to join bus](https://github.com/comunica/comunica/commit/c383376a406f4c32b24b70872330bec2d6740d5d)
  * [Add Bind-Join actor](https://github.com/comunica/comunica/commit/479f59b194c5a29d671425a6139c6a257ee784c9)
  * [Add bus for providing join selectivities](https://github.com/comunica/comunica/commit/65bf49edf3f2cce565f8431ced4a4407a3984f8b)
  * [Add variable counting join cardinality heuristic](https://github.com/comunica/comunica/commit/d54363780bde8ff8e421965e63a0ce94a4573dd5)
  * [Add minus query operation actor that delegates to join bus](https://github.com/comunica/comunica/commit/ff7cf9bf1a54339a057ded6a373feecd0951fb71)
  * [Add left join query operation actor that delegates to join bus](https://github.com/comunica/comunica/commit/e6de38792a8c86b4d73eb152b6a0acec2e3fcd8e)
  * [Add hash-based minus join actor that does not handle undefs](https://github.com/comunica/comunica/commit/0e21cff26ce453c652ee7d2a557d38bd1786d4dd)
  * [Add hash-based minus join actor that handles undefs](https://github.com/comunica/comunica/commit/751f4f119c26fcbc5a9a62525a36f9f1e67abd38)
  * [Add bind-based optional join actor](https://github.com/comunica/comunica/commit/bd3b6147e06f1abf7fb4448603d40ee880c8a404)
  * [Add nested loop-based optional join actor](https://github.com/comunica/comunica/commit/281f2891a497bed51058e9853eddf6b08311b41e)
  * [Change BGP-specific context entries to more general join entries](https://github.com/comunica/comunica/commit/20dd9d567f1aa7302ae62055f96de98e875ec043)
  * [Include original operations into join input interface](https://github.com/comunica/comunica/commit/5a869c0e02d4ebe8af681d8c6bba6b196961d9d5)
  * [Migrate to multi-join-based datastructures in sparqlalgebrajs](https://github.com/comunica/comunica/commit/b8d410bff0e6654adbf382e440356c1a4e078db4)
  * [Rename plain join actors to inner join actors](https://github.com/comunica/comunica/commit/9b375cd09619d33e227a4ca3470699a43495f32b)
* Other 
  * [Deskolemise blank nodes before updates, Closes #911](https://github.com/comunica/comunica/commit/07f890db44f53ecda9782a224c57e20d8de6db05)

### Added
* Public API
  * [Allow query plan to be printed](https://github.com/comunica/comunica/commit/ce8575e0d47c66b62c33f3899cb4e7f281e4f5b9)
  * [Add bindings-factory package](https://github.com/comunica/comunica/commit/60db84c8b1664133fffb323de30abb13204a843a)
  * [Allow full stack trace to be printed on CLI via --showStackTrace](https://github.com/comunica/comunica/commit/72f04f0b9c6c9904e4bd590f37cb260e6c0adab5)
  * [Add dedicated explain method on IQueryEngine](https://github.com/comunica/comunica/commit/7f865a47cd793b53443e7f5050ab3512e404b8e6)
* Internal API 
  * [Expose convenience types in bus packages for simpler actors impls](https://github.com/comunica/comunica/commit/d160c8f074e98bf0e857a9a530322a7f54dcd807)
  * [Add hash provider bus](https://github.com/comunica/comunica/commit/035682bd00772e794d66870112faeece2ad6ab7c)
  * [Allow packager to output list of dependencies for a config](https://github.com/comunica/comunica/commit/ac869b4ce84b68bf6e8134671e9fd09423db99ce)
  * [An optional parameter to MediatorCombinePipeline to filter erroring actors](https://github.com/comunica/comunica/commit/a2f4d401c66b036d399a0c4cb3de4fe388cf95f1)
  * [Add option to enable ordering strategy in MediatorCombinePipeline](https://github.com/comunica/comunica/commit/38d1f82dca6dc9aa23ed3a2ec3f04ac1281d029f)
  * [Add setSafe method to IActionContext](https://github.com/comunica/comunica/commit/ff4aa04af9bbb1d768150aa2f167395ce2095a2c)

### Changed
* Automatically generate `components/` directories:
  * [Remove components directory from git](https://github.com/comunica/comunica/commit/957fefdcae177cb4aed66fe339b853cad9acadef)
  * [Generate components in bulk](https://github.com/comunica/comunica/commit/58187c86541ceca4a96b2289b98ba835694b9517)
* [Move index files to lib directory](https://github.com/comunica/comunica/commit/0148e0aefe0b33e7219d17ec563ed4a3b102d3af)
* [Update to sparqlalgebrajs 4](https://github.com/comunica/comunica/commit/bf571ffbcf9eac9d31c5c1efd5ea4c330bc6f25f)
* [Mark parsed quad stream as Readable](https://github.com/comunica/comunica/commit/d48058699a155a71b3a81fa70d775925cc4852f9)
* [Send original SPARQL query string to endpoints](https://github.com/comunica/comunica/commit/9daec7da03e159726559720acd0221881533d179)
* [Update to Webpack 5](https://github.com/comunica/comunica/commit/dcd2a8adc2e15be0b3f9033ed81e3e6dc791a370)
* [Add sideEffects: false to package.json files for treeshaking](https://github.com/comunica/comunica/commit/a4380229eea6e28aba544f7982829556b6d0f6e9)
* [Prefer joins with early results for queries with limit](https://github.com/comunica/comunica/commit/5e2789cf6db024c18468642b3986277224516ae8)

<a name="v1.22.3"></a>
## [v1.22.3](https://github.com/comunica/comunica/compare/v1.22.2...v1.22.3) - 2021-10-19

### Fixed
* [Fix CORS issues when querying in Firefox](https://github.com/comunica/comunica/commit/248f54b94fab944222ff1e8224b2f389e1b4651e)
* [Fix media type overriding not working for HTTP requests](https://github.com/comunica/comunica/commit/3cf9182b17e11f2667d55e29b5806f0658717658)
* [Fix source type detection not always working in SERVICE](https://github.com/comunica/comunica/commit/150f1d12bb805a882580834a53c2d4eb906b4298)

<a name="v1.22.2"></a>
## [v1.22.2](https://github.com/comunica/comunica/compare/v1.22.1...v1.22.2) - 2021-09-30

### Changed
* [Include HTTP response in update error messages](https://github.com/comunica/comunica/commit/138558e68f37110bf63fb7d26780a709672cc441)
* [Allow patchSparqlUpdate destinations to not exist when forced](https://github.com/comunica/comunica/commit/6dd89e495ef26a0e96b2eb42cf489673c4d549f2)
* [Extract ms-author-via header for SPARQL updates, to support older Solid servers](https://github.com/comunica/comunica/commit/1c40a60b8fcd0919b0ebb63dd4e9c6b1c3b5cae2)
* [Pass optional headers in dereference errors](https://github.com/comunica/comunica/commit/f0633f01154d70229a95762170297c4abb09a791)

### Fixed
* [Fix fetch actor ignoring request bodies in Node.js](https://github.com/comunica/comunica/commit/65d4041695adb7d35dda080647dfe0d9cbdd249d)
* [Add temporary workaround for loss of Headers on Solid auth requests](https://github.com/comunica/comunica/commit/e92e5171b1a2c9d6eb427117041ebb9ea622790c)

<a name="v1.22.1"></a>
## [v1.22.1](https://github.com/comunica/comunica/compare/v1.22.0...v1.22.1) - 2021-09-22

### Fixed
* [Fix rare stream interruption before end](https://github.com/comunica/comunica/commit/93df41c4c03ddb1f307430b75ea15a4ef4edc9d1)

<a name="v1.22.0"></a>
## [v1.22.0](https://github.com/comunica/comunica/compare/v1.21.3...v1.22.0) - 2021-08-30

### Added
* [Add support for SPARQL extension functions](https://github.com/comunica/comunica/commit/3e52660b7cafc63cbc84062035938c607ec0e0d5)
* [Allow custom fetch function to be provided via context](https://github.com/comunica/comunica/commit/a89f88fc1bf63c6e5d8ec7d5aee4199cd8b01e58)
* [Support AbortControllers in native http actor](https://github.com/comunica/comunica/commit/23baf6677cd6036b729a0fbd77a04e02373fc2ea)
* [Report FILTER errors as warnings in the logger, Closes #767](https://github.com/comunica/comunica/commit/cf12a9af63078917c0577f1d4b7d023506eda9e5)
* [Add SPARQL endpoint-based hypermedia update actor](https://github.com/comunica/comunica/commit/299848579c6f8d6570a169d7288d36849b806213)
* Allow resource creation via HTTP PUT:
  * [Add RDF update hypermedia actor for LDP PUT destinations](https://github.com/comunica/comunica/commit/db92b17a541f5121a03c0ab6976dbfe9841f5e1e)
  * [Configure RDF update hypermedia actor for LDP PUT destinations](https://github.com/comunica/comunica/commit/d78c2a1b543d0dfcfd244780f6b1c730a6ba966a)
  * [Allow RDF dereference actors to return on non-200 responses](https://github.com/comunica/comunica/commit/620a346794b428b281dd36831ee7d2d4a2407527)
  * [Add metadata extractor for HTTP Accept-Put header](https://github.com/comunica/comunica/commit/4fdacaacad987647e008422ec04b63c20dc8d7d3)
  * [Add metadata extractor for HTTP Allow header](https://github.com/comunica/comunica/commit/40224738062cceb7634ebbe2b81911ab5516c458)

### Changed
* [Refactor CLI arguments handling using yargs](https://github.com/comunica/comunica/commit/8155391e9dba0c4d9d04c08e3abc0999a11f329c)
* [Optimize node-fetch HTTP actor and set as default](https://github.com/comunica/comunica/commit/a96547be4b112887a4e164496e2c6540737d8391)
* [Include response body in dereference errors](https://github.com/comunica/comunica/commit/f6c2d5b2fe920808cf9ab98071da769f763c0515)
* [Bump fetch-sparql-endpoint with improved error reporting for SPARQL endpoints](https://github.com/comunica/comunica/commit/b859e509a4e3d53c5348546978050c30f3d85f93)
* [Update dependency htmlparser2 to v7 (#851)](https://github.com/comunica/comunica/commit/2291166a055549d5b30a0072ed3937d6d8e95cf4)
* [Migrate to @rdfjs/types](https://github.com/comunica/comunica/commit/dfb903079605ce898f7206b0125eb60e89f993c8)
* [Bump to sparqlalgebrajs 3](https://github.com/comunica/comunica/commit/51a34ac3ff150a48958d02d7828a092ae6a693dd)
* [Notify downstream clients on worker timeout](https://github.com/comunica/comunica/commit/16191d399fe0cbd2ebd08cdadb2cd0c509bb9e79)
* [Bump fetch-sparql-endpoint with AbortControllers](https://github.com/comunica/comunica/commit/c03af59507b9ad7aeedaa2f5251cb72fc0ef09bf)
* [Make HTTP accept headers deterministic](https://github.com/comunica/comunica/commit/5ae9883a491aa325d31ad6b27de0a0a88b898d13)
* [Add URL-based heuristic to determine SPARQL endpoints to top-level actor](https://github.com/comunica/comunica/commit/d1fd3aa0794c1fc1109b58335f1853e373ac8cb2)

### Fixed
* [Update to AsyncIterator 3.2.0 to fix memory issue](https://github.com/comunica/comunica/commit/b0aeb67743eb187ddfb4e6fe8b42df240f3a9de7)
* [Fix http proxy not working with immutable node-fetch response](https://github.com/comunica/comunica/commit/da96cca3d667ec2439445f04408888faf88290cb)
* [Fix invalid hash implementation for hash-join](https://github.com/comunica/comunica/commit/6b26e80ca3c06b19a153ce15ff5d2a07a833c40d)
* [Fix node-fetch actor not supporting body.cancel](https://github.com/comunica/comunica/commit/bd06266b7f616880554e98f25b46776046ab7518)
* [Do not reset sparql.js blank-node counter (Closes #836)](https://github.com/comunica/comunica/commit/38e33bf137cbd4836daea450142d4915a633371d)
* [Fix SPARQL-based update actors not being able to handle quads](https://github.com/comunica/comunica/commit/65695538c92f0da329cd1c398a6736c348422c84)

<a name="v1.21.3"></a>
## [v1.21.3](https://github.com/comunica/comunica/compare/v1.21.2...v1.21.3) - 2021-06-18

### Fixed
* [Fix POST requests with body not working on browsers](https://github.com/comunica/comunica/commit/3b01e4bf492293f0e887acf4423ab872c035085a)

<a name="v1.21.2"></a>
## [v1.21.2](https://github.com/comunica/comunica/compare/v1.21.1...v1.21.2) - 2021-06-14

### Changed
* [Interact with SPARQL endpoints via HTTP POST, Closes #814](https://github.com/comunica/comunica/commit/fa00e7e16d5390c7e02dfe45753faea00c7bf620)
* [Update dependency @types/node to v14](https://github.com/comunica/comunica/commit/16fb7130fcf4fac13455956463c6b858d912c0e9)
* [Update jsonld-streaming-parser to 2.3.2](https://github.com/comunica/comunica/commit/316605c5c734044f4222afd9482b4050d64e3f3c)

<a name="v1.21.1"></a>
## [v1.21.1](https://github.com/comunica/comunica/compare/v1.21.0...v1.21.1) - 2021-04-27

Republish due to npm publishing failure of 1.21.0.

<a name="v1.21.0"></a>
## [v1.21.0](https://github.com/comunica/comunica/compare/v1.20.0...v1.21.0) - 2021-04-27

### Added
* Enable hypermedia-driven updates
    * [Pass headers to metadata extraction actors](https://github.com/comunica/comunica/commit/421f7b421d906c9d3addad9ff9bbca4a72e242d5)
    * [Add metadata extractor for detecting SPARQL Update Patch servers](https://github.com/comunica/comunica/commit/e63ee7e7a98ca6872846edd9ceb5864709f6781f)
    * [Configure hypermedia-based update actors](https://github.com/comunica/comunica/commit/cc879d80d07d50e1eba0aa9a4932fad7562406f7)
    * [Add actor for handling servers supporting SPARQL Update patches](https://github.com/comunica/comunica/commit/e789df603911f20806c4854fafc4b12352f772ea)
    * [Add update actor for delegating to hypermedia bus](https://github.com/comunica/comunica/commit/19197a4c14e4b80c4efe928f644c1e116797c4b2)
    * [Add bus for hypermedia-based update actors](https://github.com/comunica/comunica/commit/735bc5e3950a55680214ebbb150cbe12b4cac2dd)
* [Support HTTP requests with bodies](https://github.com/comunica/comunica/commit/2c84199d53e018aad7799d5e638171ed1d2b40bc)
* [Allow context modification in optimize-query-operation bus](https://github.com/comunica/comunica/commit/81373206a17d0fcb8d3af701e5266287113d545c)

### Changed
* [Move IQuadDestination to separate file](https://github.com/comunica/comunica/commit/17651f77321276e2a0a7865b8265d079f2d5145d)
* [Allow multiple graphs to be created/deleted in IQuadDestination](https://github.com/comunica/comunica/commit/e695c5e468c402e1cd6ade35254c14a92963ba43)
* [Use --to option instead of -d to mark destination on CLI](https://github.com/comunica/comunica/commit/cbe309139558a59722370c031e3726fe1ea2f5b2)
* [Allow any parser options to be passed to actor-rdf-parse-jsonld](https://github.com/comunica/comunica/commit/199710d70b01d22ea40fe5e12e16a9d8800f32fc)

### Fixed
* [Emit non-zero exit code on CLI errors, Closes #805](https://github.com/comunica/comunica/commit/00aa446cc8d2fd713711787b8a59f45c266947ea)
* [Remove unnecessary dependencies on utils-datasource to mute Yarn warnings](https://github.com/comunica/comunica/commit/861953827475c5307b27db192784c86fb5ec39dc)
* [Fix types dependencies not being actual dependencies](https://github.com/comunica/comunica/commit/e0b7e29b640bf720206e2082c9ddf4461900d6ed)
* [Fix unable to federate over multiple GraphDB instances](https://github.com/comunica/comunica/commit/fab22d68a5a51393ae2f5b38870f30db3e8034b3)

<a name="v1.20.0"></a>
## [v1.20.0](https://github.com/comunica/comunica/compare/v1.19.2...v1.20.0) - 2021-03-30

### Added
* Add support for SPARQL Update queries
    * [Add update actors to all init engines](https://github.com/comunica/comunica/commit/5cfd55fc727c5723dd3ad754fa3f59a057cb212a)
    * [Support update queries in SPARQL endpoint](https://github.com/comunica/comunica/commit/23baaac3b2178ac24b65e2b8431102bfc7630f25)
    * [Support update results in simple serializer](https://github.com/comunica/comunica/commit/95e72833fe423b553652a4f4668f1e055ad52ee9)
    * [Add readOnly context entry that makes update actors fail](https://github.com/comunica/comunica/commit/637369d6766bffb328b8f0badac40fad25742bfb)
    * [Allow single source in context to be inherited as destination](https://github.com/comunica/comunica/commit/2d473a86d569b432042b8c8c2ec2f22ae4fdc32f)
    * [Add add, copy, and move update operation actors](https://github.com/comunica/comunica/commit/d5eb6fb802decec3a801fa6cd1ce9ac4905fb066)
    * [Add create update operation](https://github.com/comunica/comunica/commit/2e1ed0b208ed20d70cead12a0931472f8b88097d)
    * [Add clear and drop update operations](https://github.com/comunica/comunica/commit/76e5fd274808ff57a1cf2b263e83f2c82a2e08f1)
    * [Configure load update actor](https://github.com/comunica/comunica/commit/5f6fff8323477f5af0b49bc65de0b376b2cfaadd)
    * [Add load update query operation actor](https://github.com/comunica/comunica/commit/32b8639916db77a851646cf4d6c072e462ac3644)
    * [Add fallback rdf-dereference actor](https://github.com/comunica/comunica/commit/047ec2519222a724fbd4679c13ebf209f5f4e2a2)
    * [Run SPARQL Update test suite](https://github.com/comunica/comunica/commit/a517873e68dff05f3635754954b21c6e6c2c3178)
    * [Enable passing destination via the CLI](https://github.com/comunica/comunica/commit/3db79860ebd1b0f26364f8a2382cb99c53d556d1)
    * [Configure INSERT and DELETE actors](https://github.com/comunica/comunica/commit/0f790e9b66f8151c6baf0e6618d9fe5aa98d6be8)
    * [Add composite update operation actor](https://github.com/comunica/comunica/commit/c6ea8db2fb0491a7d2098ab4e1707a7195cece1b)
    * [Add INSERT/DELETE operation actor](https://github.com/comunica/comunica/commit/2eedb3f3b8928ecd0d330603ddfec1efc0ef1e26)
    * [Add RDF update actor that handles RDF/JS stores](https://github.com/comunica/comunica/commit/75756dcd63a28134b03fc7df6cacf2140f4fbc7a)
    * [Add bus for handling quad updates](https://github.com/comunica/comunica/commit/13461a8df6c21c69a128386613ab4de12f221e4c)
    * [Add update query operation output type](https://github.com/comunica/comunica/commit/896dc07ff7cfce94950adfa6e820b6138ce563e8)
* [Enable worker threads in SPARQL endpoints](https://github.com/comunica/comunica/commit/607ba34c085089caa9a02c6d606aefc63b7e996d)
* [Delegate link queue creation to the new link queue bus](https://github.com/comunica/comunica/commit/8de44d1da8e63c9b3a15c26dadcb003c2c00f136)

### Changed
* [Move public query engine interfaces into @comunica/types](https://github.com/comunica/comunica/commit/3f46a233883b699df87fcee3215516f97e15e346)
* [Move all context keys to '@comunica/context-entries'](https://github.com/comunica/comunica/commit/12b9ee3e8e5bc2d0fadd662a3d6aeef838b87619)
* [Keep track of parent link when pushing into link queue](https://github.com/comunica/comunica/commit/65ae0b1b6e2aad4368d2bcb76956a7f7b9474b6a)
* [Save original query in context](https://github.com/comunica/comunica/commit/97e2cf1076fa296443e2fae80c223e46613cae68)

### Fixed
* [Enable blank node correlation across results, Closes #795](https://github.com/comunica/comunica/commit/d9b93b4608c69e6c8b710b664c37e47a1c0d41c7)
* [Fix FROM/FROM NAMED not always restricting views](https://github.com/comunica/comunica/commit/1eb8ce0e91ee34464663a6b8648f7bb6845f56a6)
* [Bump asyncjoin with close on undefined fix, Closes #791](https://github.com/comunica/comunica/commit/81767a2ab65f5b23002ae738806b277e8b91338d)
* [Fix process hanging if a source parsing action rejects, Closes #786](https://github.com/comunica/comunica/commit/7e77c0134b8354eb735ab2b805f8f6689f7c6b34)
* [Fix hypermedia quad pattern resolver not skipping links to itself](https://github.com/comunica/comunica/commit/9e11ee35123790a9d8028976c648ede6f836ac04)

<a name="v1.19.2"></a>
## [v1.19.2](https://github.com/comunica/comunica/compare/v1.19.1...v1.19.2) - 2021-02-02

### Changed
* [Remove disabling of stacktraces when in production](https://github.com/comunica/comunica/commit/72c3b03fa1adda907dbcfbda2bafca7ce710167a)

### Fixed
* [Fix unhandled promise rejection on server errors](https://github.com/comunica/comunica/commit/4e2771d1e9307e2d5cfb1f97abd54d23f398bc87)

<a name="v1.19.1"></a>
## [v1.19.1](https://github.com/comunica/comunica/compare/v1.19.0...v1.19.1) - 2021-01-22

### Fixed
* [Fix logger not always producing output, Closes #774](https://github.com/comunica/comunica/commit/3cb07b6e81fe74820110487bccda8d9a2fc804b9)

<a name="v1.19.0"></a>
## [v1.19.0](https://github.com/comunica/comunica/compare/v1.18.1...v1.19.0) - 2021-01-15

### Changed
* [Update to Components.js 4](https://github.com/comunica/comunica/commit/26160e821cd13a71d4d2bd0178b351f8d257f8d8)
* [Update dependency htmlparser2 to v6](https://github.com/comunica/comunica/commit/25e7a6b05c96f46a82efaa126d18ff7d47fdac13)

<a name="v1.18.1"></a>
## [v1.18.1](https://github.com/comunica/comunica/compare/v1.18.0...v1.18.1) - 2020-12-01

### Fixed
* [Fix HTTP service not handling conneg correctly with wildcards](https://github.com/comunica/comunica/commit/f4d672086cc9f1bd620733480c87f3c8e252d6ee)
* [Remove unsafe usages of process](https://github.com/comunica/comunica/commit/bf5e6a2a0807188bd0bab224da1746b9f48c5d33)
* [Fix minor (non-breaking) issues with configs](https://github.com/comunica/comunica/commit/12013a54fc0c46a84bcd1687990d37a235ce46cf)

<a name="v1.18.0"></a>
## [v1.18.0](https://github.com/comunica/comunica/compare/v1.17.0...v1.18.0) - 2020-11-02

### Fixed
* [Fix eager accept header boundary bug, Closes #534](https://github.com/comunica/comunica/commit/f60f8b2a7f2bd18d342b02a6f1248e99e2dd5398)
* [Fix incorrect return type for bindings(), Closes #742](https://github.com/comunica/comunica/commit/7cfa946fa950573c006c6fcc1cf0a974c2dbdcb7)
* [Add missing query result interface exports](https://github.com/comunica/comunica/commit/e803e6715a8364ea1b082ada1749023f9abc6ed1)

### Added
* [Add Microdata to RDF parser](https://github.com/comunica/comunica/commit/ca9400a5a9e1241aad17976554f9fbf7e32aafe2)
* [Add actor whitelist to LoggerPretty](https://github.com/comunica/comunica/commit/878bce72bdd84605cbe454972fad2b58454fa88b)

### Changed
* [Use fixed hashing functions](https://github.com/comunica/comunica/commit/921a33266fc5b2faf71742e6e5d6659ba311e7ba)
* [Update sparqlee to achieve smaller bundle sizes](https://github.com/comunica/comunica/commit/89d4fefa3a01202c988825d2b45ce6ce7e848f63)
* [Bump sparqlee with improved XPath and Unicode support](https://github.com/comunica/comunica/commit/5fb3275c1ea887b692fc2caae5a271e29635a56b)
* [Allow quad streams on followed links to be transformed](https://github.com/comunica/comunica/commit/f2d30145a15d4312728d3940ec520bf8da204154)
* [Allow hypermedia links to define custom context entries](https://github.com/comunica/comunica/commit/420540f0e2ae864e8a79062f74852753560ab8b8)
* [Allow JSON-LD strict mode to be enabled via context](https://github.com/comunica/comunica/commit/9e575bbf41bcf089c1b7e1ee0142f5bebd30db89)
* [Allow custom JSON-LD document loader to be passed via context](https://github.com/comunica/comunica/commit/b374aa1f4a23988b4c0c2ce039e2dd05acbe16eb)

<a name="v1.17.0"></a>
## [v1.17.0](https://github.com/comunica/comunica/compare/v1.16.2...v1.17.0) - 2020-09-25

### Added
* [Include request headers in logs, Closes #703](https://github.com/comunica/comunica/commit/e01ffce235674b6fe31995e65a6fb3a2b727d25c)
* [Include user agent in node-fetch HTTP actor](https://github.com/comunica/comunica/commit/801906fa9831c9a0468798823d8004f205d6ffc1)

### Changed
* [Update to asynciterator 3.0.3 to fix hanging queries](https://github.com/comunica/comunica/commit/aef4c7d342470a2df261b86b74b0fab3c63a60e7)
* [Make metadata retrieval more robust, and fix errors where metadata is emitted before end event](https://github.com/comunica/comunica/commit/3095b269f1d98d706d1056495123a69bffe3b457)
* [Make logger data argument lazy](https://github.com/comunica/comunica/commit/e6d7cee1f7622e4bcb73188a0060d5d9823958f0)
* [Tweak priorities to let endpoint default to application/json, Closes #662](https://github.com/comunica/comunica/commit/cdde3559b51825eaebb686fffe0a9edf7c8ef238)
* [Increase default Turtle priority to 0.6, higher than RDF/XML](https://github.com/comunica/comunica/commit/78a46049650697623fbca1c99b3a2e6f7836c7f1)
* [Update to @types/rdf-js 4](https://github.com/comunica/comunica/commit/e6487936ce5399d3a8173dbdd56ce06b96657d36)
* [Migrate to rdf-data-factory](https://github.com/comunica/comunica/commit/7f04ab404a9f5ad2369d7ffe9ba83b56e1e72c37)

### Fixed
* [Update to JSON-LD context parser with schema.org fix](https://github.com/comunica/comunica/commit/2d0818c64e5bfbbb334ecbccb7b5a98a69263d1c)
* [Fix redirect not including query parameter](https://github.com/comunica/comunica/commit/530a2c71ff62cf10888156d037472b8a15bf4911)

<a name="v1.16.2"></a>
## [v1.16.2](https://github.com/comunica/comunica/compare/v1.16.1...v1.16.2) - 2020-08-24

### Fixed
* [Fix native HTTP actor broken in browser](https://github.com/comunica/comunica/commit/98521f3a63c79895003e0dbb8fb11011dd856997)

<a name="v1.16.1"></a>
## [v1.16.1](https://github.com/comunica/comunica/compare/v1.16.0...v1.16.1) - 2020-08-24

### Fixed
* [Fix incorrect JSON-LD error code on target script error](https://github.com/comunica/comunica/commit/89e5aad4e95db48502fb1c91dd6a95ba38e8b687)

<a name="v1.16.0"></a>
## [v1.16.0](https://github.com/comunica/comunica/compare/v1.15.0...v1.16.0) - 2020-08-24

### Added
* [Implement missing property path cases](https://github.com/comunica/comunica/commit/5f088603343bdf5de565feb38d7b042bf9cf2c80)
* [Add HTTP basic authentication support, Closes #613](https://github.com/comunica/comunica/commit/a63d83b68ceb165c76a30e62627f4a9569e59150)
* [Add TSV SPARQL results serializer, #220](https://github.com/comunica/comunica/commit/276ddbaddb9e51ac213b5ba9062272e8b467a67e)
* [Add CSV SPARQL results serializer, #220](https://github.com/comunica/comunica/commit/2704d82f6ce3a7dc1330e1e4c8ccbda5176f945e)

### Fixed
* [Update sparql parser to fix all syntax spec test failures, #287](https://github.com/comunica/comunica/commit/90f0465491873678048310975eaf34bcf57882fe)
* [Fix network request without headers, Closes #700 (#701)](https://github.com/comunica/comunica/commit/0d5f2a0e5dead75dce4f6b4117ea8e7951415a12)
* [Correctly handle aggregates without group](https://github.com/comunica/comunica/commit/cfa9044bb6d4ec5743d1bc3229a6d69a95f4dbfe)
* [Fix subquery aggregates halting the process](https://github.com/comunica/comunica/commit/6128993f228b9b969f6fde38827bda0505a5b677)
* [Fix variable graph also matching with default graph](https://github.com/comunica/comunica/commit/f198357644a7d0fd5c25f16092010dcf8f0fee31)
* [Fix hypermedia actor failing on * property path queries](https://github.com/comunica/comunica/commit/ad8e20abdf05e1f8c4f51909891fc00274605aa4)
* [Fix property path queries failing with named graphs](https://github.com/comunica/comunica/commit/556976cd9d91c4fadb967af2b647b2daf74d7597)
* [Fix mainModulePath overriding not being possible in dynamic exec](https://github.com/comunica/comunica/commit/156b65fb3a78a0aadde10a169eeca9b643efa148)
* [Fix process hanging after HTTP error](https://github.com/comunica/comunica/commit/45fe4a0316efd6d6b3837a5a0a927fe7d1e70a1c)
* [Fix HTTP error events being emitted twice](https://github.com/comunica/comunica/commit/6e170f220c69b336441341a1b2cf175de1bba96d)
* [Fix targeted HTML script tags not throwing error if of unknown type](https://github.com/comunica/comunica/commit/e453819246b28e79fea7a4105d58bba85f1207cb)
* [Fix missing newline after --listformats](https://github.com/comunica/comunica/commit/96ee094a85145d5122abfcdba45351620080a0cd)

### Changed
* [Configure nestedloop join actor for handling streams with undefs](https://github.com/comunica/comunica/commit/4ea4d6cdbd6bf5898c2c154fb76964db39b6a0d0)
* [Annotate bindingsStreams with canContainUndefs flag](https://github.com/comunica/comunica/commit/028ae5dc7b83aa10df2834db5d57154873998737)

<a name="v1.15.0"></a>
## [v1.15.0](https://github.com/comunica/comunica/compare/v1.14.0...v1.15.0) - 2020-08-13

### Added
* [Add convenience methods for getting query results as arrays](https://github.com/comunica/comunica/commit/6448e65aabbd0a3cae0ee3645291a86974305990)
* [Add option to include credentials in browsers](https://github.com/comunica/comunica/commit/2492fe93b8afa30a866b023958f5e0847c4fbc94)
* [Enable min/max over non-numerical literal, Closes #673](https://github.com/comunica/comunica/commit/941c45fc986342f43d9e7ca873ea1d6d6021dbb1)

### Changed
* [Improve command signature of comunica-sparql-http](https://github.com/comunica/comunica/commit/cc3e73c526a7df4d19877c325c1dfd72c9f00030)
* [Remove lodash dependencies, Closes #402](https://github.com/comunica/comunica/commit/c92a38324cc1967532a75377e0781c7cf64da2ed)

### Fixed
* [Fix error when parsing webpage with JSON script tag, Closes #707](https://github.com/comunica/comunica/commit/3f9475edc955c63bc502db6ff49eef89ea0c3df8)
* [Update to asynciterator 3.0.1 to undo webpack hack](https://github.com/comunica/comunica/commit/1c990bf351930d0fec907d8eab6dafd715af37a8)
* [Add missing newline after each pretty log line](https://github.com/comunica/comunica/commit/c9568e622883799bc13b8d7e6bac0c0eca631a1d)
* [Fix incorrect hash function in symmetric hash join, Closes #608](https://github.com/comunica/comunica/commit/6a4baf7efc0baa946a4eea3d842c4351b6e60d03)
* [Bump to sparqlee 1.4.2 with strtswith and endswith fix](https://github.com/comunica/comunica/commit/f395463dc2c1bca6c91f2e8cd2385a0d7fce24b4)

<a name="v1.14.0"></a>
## [v1.14.0](https://github.com/comunica/comunica/compare/v1.13.1...v1.14.0) - 2020-07-24

### Added
* [Enable cardinality estimates in RDFJS sources](https://github.com/comunica/comunica/commit/88b8850c07f864a9abfcb5d0335fa51cd9c5df93)
* [Redirect default HTTP index to /sparql, Closes #663](https://github.com/comunica/comunica/commit/e4d9a989ca9aec43e74ac4d599d0619fb71c92ea)
* [Simplify how RDFJS sources can be passed](https://github.com/comunica/comunica/commit/f13c76cb6c159c2efa29d2d09aa9544f9246aa16)

### Changed
* [Migrate to asynciterator to 3 to improve performance in browsers](https://github.com/comunica/comunica/commit/00ab75acfe60af8572dd7def454be673d724a2e8)
* [Update dependency lru-cache to v6](https://github.com/comunica/comunica/commit/87dc51a4a4a4a2799752f34de74d6175d6eb41ff)
* [Move relevant @types to dependencies, Closes #294](https://github.com/comunica/comunica/commit/3a3c40fb442f3a67f2ca964523494e94b8ac8413)
* [Replace json-stable-stringify dependency with canonicalize, Closes #590](https://github.com/comunica/comunica/commit/3400465376830528dde1ba829e1367be01354aaf)

### Fixed
* [Fix floating promises](https://github.com/comunica/comunica/commit/072db561e3bca7b9dd652b7bf10e70707edf7266)
* [Fix test failures on Node 10](https://github.com/comunica/comunica/commit/1b23e9640098eba2f3d99c11928d8e4ded9005d0)
* [Use latest fetch API with cross-fetch to fix fetch-related compatibility issues](https://github.com/comunica/comunica/commit/996d286500c9f71b8eb5c1786017b9c2ea54227f)
* [Fix orderby not taking numerical types into account](https://github.com/comunica/comunica/commit/638b64872e07b8794407aaab7d0a4e8966599c17)
* [Fix invalid RDFJS actor IRI](https://github.com/comunica/comunica/commit/343ad6962f0132c0cf4589b278df521914146f04)
* [Fix newEngine in SPARQL init file exporting browser build, Closes #648](https://github.com/comunica/comunica/commit/4b6bd248860f3c58b820ed6dff4b56c3d35c7bfc)
* [Fix orderby not properly handing multiple comparators, Closes #598](https://github.com/comunica/comunica/commit/eb1c91f83903a044a582de1b246377f5563da96c)

<a name="v1.13.1"></a>
## [v1.13.1](https://github.com/comunica/comunica/compare/v1.13.0...v1.13.1) - 2020-06-11

### Fixed
* [Fix crash when using CONSTRUCT queries](https://github.com/comunica/comunica/commit/52cf6b021b598eb8bcb02ac10c11b885ae12b73c)
* [Fix unasigned variables in projection result](https://github.com/comunica/comunica/commit/4a20b8d15fc0dfa6dcc97a4ef349ade5986f5e70)

<a name="v1.13.0"></a>
## [v1.13.0](https://github.com/comunica/comunica/compare/v1.12.1...v1.13.0) - 2020-06-03

### Fixed
* [Modify JSON-LD document loader to consider redirects](https://github.com/comunica/comunica/commit/073281ec9b6d3a31d6c26a9ae7aa5c2f53230bc6)
* [Fix table serializer producing inconsistent column orders, Closes #643](https://github.com/comunica/comunica/commit/357ed81eb98649b8e738966542be7984077f2fb7)
* [Update sparqlalgebra to fix invalid COUNT queries to endpoints](https://github.com/comunica/comunica/commit/6481a4186b78fe032c4e4c5fb3156a6cc4e4518b)

### Changed
* [Enable stricter TypeScript compilation, Closes #628](https://github.com/comunica/comunica/commit/27017c6f7526dffe2b38a476dee910c144c4fc22)

<a name="v1.12.1"></a>
## [v1.12.1](https://github.com/comunica/comunica/compare/v1.11.1...v1.12.1) - 2020-04-27

### Fixed
* [Fix EXISTS in BIND failing, Closes #650](https://github.com/comunica/comunica/commit/99ed974930bb7718a8d89aeb4ee46435df5dbcfe)
* [Fix project operator removing scoped blank nodes, solid/query-ldflex#64](https://github.com/comunica/comunica/commit/05852bbf6080dd4d99b75aa979f392c463b066c1)

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
