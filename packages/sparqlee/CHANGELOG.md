# Changelog

<a name="v1.6.2"></a>
## [v1.6.2](https://github.com/comunica/sparqlee/compare/v1.6.1...v1.6.2) - 2021-03-29

### Fixed
* [Preserve the original blank node in bnode generator functions](https://github.com/comunica/sparqlee/commit/c843192619217bdfd9a23be836d4941a212d3d04)

<a name="v1.6.1"></a>
## [v1.6.1](https://github.com/comunica/sparqlee/compare/v1.6.0...v1.6.1) - 2021-03-26

### Fixed
* [Fix missing bnode custom generator fn in the context](https://github.com/comunica/sparqlee/commit/40150452a57304a71d175766e6d4f7064b1ed059)

<a name="v1.6.0"></a>
## [v1.6.0](https://github.com/comunica/sparqlee/compare/v1.5.1...v1.6.0) - 2020-11-01

### Changed
* [Replaces create-hash with hash.js and spark-md5](https://github.com/comunica/sparqlee/commit/526daf838a272f0ffa6e121ddd8ba9c67855af08)

<a name="v1.5.1"></a>
## [v1.5.1](https://github.com/comunica/sparqlee/compare/v1.5.0...v1.5.1) - 2020-10-23

### Fixed
* [Improve spec-compliance of XPath constructor functions](https://github.com/comunica/sparqlee/commit/59d9b5c0f2d992c1d1a8348afce8775939d1cff3)
* [Handle characters outside Unicode BMP](https://github.com/comunica/sparqlee/commit/4b873834a38c35329495d142eaf1c59f56fc0038)

<a name="v1.5.0"></a>
## [v1.5.0](https://github.com/comunica/sparqlee/compare/v1.4.3...v1.5.0) - 2020-09-17

### Changed
* [Migrate to relative-to-absolute-iri to reduce bundle size](https://github.com/comunica/sparqlee/commit/979c3be15f9691b7fbf44242ecab2685d79783df)
* [Migrate to rdf-data-factory and @types/rdf-js 4.x](https://github.com/comunica/sparqlee/commit/907d7fcda82f1017d9ae4b517acb38037d1feba3)

<a name="v1.4.3"></a>
## [v1.4.3](https://github.com/comunica/sparqlee/compare/v1.4.2...v1.4.3) - 2020-08-21

### Fixed
* [Make it possible to aggregate over different literal types](https://github.com/comunica/sparqlee/commit/12d5436eaa770000dac6897a4029c351eb45f437)

<a name="v1.4.2"></a>
## [v1.4.2](https://github.com/comunica/sparqlee/compare/v1.4.1...v1.4.2) - 2020-07-31

### Fixed
* [Fix strtswith and endswith incorrectly calling includes, Closes #72](https://github.com/comunica/sparqlee/commit/b558c446bc526430d3fb378f17cfbc4cb6d7254d)

<a name="v1.4.1"></a>
## [v1.4.1](https://github.com/comunica/sparqlee/compare/v1.4.0...v1.4.1) - 2020-07-28

### Fixed
* [Enable min/max over non-numerical literals](https://github.com/comunica/sparqlee/commit/c6a5a9373619e132bfb72b94aa7bb1f1443bbeac)

### Changed
* [Move relevant @types to dependencies](https://github.com/comunica/sparqlee/commit/f80f1b69a36b9ecbac6422ba36c6ff2c74b0b595)

<a name="v1.4.0"></a>
## [v1.4.0](https://github.com/comunica/sparqlee/compare/v1.3.2...v1.4.0) - 2020-07-09

### Added
* [Expose function to order two terms](https://github.com/comunica/sparqlee/commit/073c5c22c7f8b8d884c6b8f1d8477ff08878603b)

### Changed
* [Update dependency asynciterator to v3](https://github.com/comunica/sparqlee/commit/3c40febcae0dda5d308b860cd2e66e2c23ad1c02)
* [Update dependency @types/uuid to v8](https://github.com/comunica/sparqlee/commit/7b19adfa2cbca37b0013463d09f2badec2365690)
* [Update dependency uuid to v8](https://github.com/comunica/sparqlee/commit/b28a74160e0010233f7dac0deb5ec8eff2c78bd1)
* [Update dependency @types/rdf-js to v3, Closes #62](https://github.com/comunica/sparqlee/commit/cfde56a35ea8eb57a9e462503a7b2582fcf60240)

<a name="v1.3.2"></a>
## [v1.3.2](https://github.com/comunica/sparqlee/compare/v1.3.1...v1.3.2) - 2020-03-23

### Fixed
* [Use xsd:dateTime format (ISO 8601) for NOW.](https://github.com/comunica/sparqlee/commit/7cbf7ffe429771fa101368687a775a6c8136c1b6)

<a name="v1.3.1"></a>
## [v1.3.1](https://github.com/comunica/sparqlee/compare/v1.3.0...v1.3.1) - 2019-12-06

### Fixed
* [Fix compilation issue in Consts#make, Closes #51](https://github.com/comunica/sparqlee/commit/823f17ef06d17123a7f929a4e92a62ac12bbda17)

<a name="v1.3.0"></a>
## [v1.3.0](https://github.com/comunica/sparqlee/compare/v1.2.1...v1.3.0) - 2019-10-14

### Changed
* [Support wildcards](https://github.com/comunica/sparqlee/commit/f1bc3c2ea6e9bcf896e33143b74d198be251d8c3)
* [Update sparqlalgebrajs to version 2.0.0](https://github.com/comunica/sparqlee/commit/1c33ea4202b719615b907f45cecd0aafa2bd51e8)

<a name="v1.2.1"></a>
## [v1.2.1](https://github.com/comunica/sparqlee/compare/v1.2.0...v1.2.1) - 2019-09-12

### Fixed
* [Make BNODE with argument create an exact labelled blank node](https://github.com/comunica/sparqlee/commit/64eeab767c926052538a572c1878b5e1a9fa4e7f)

<a name="v1.2.0"></a>
## [v1.2.0](https://github.com/comunica/sparqlee/compare/v1.1.0...v1.2.0) - 2019-08-07

### Changed
* [Use decimal.js for add, sub, mul and div](https://github.com/comunica/sparqlee/commit/1b70578e5a9425f39e9d6432ee6a6ea740dc81ce)

<a name="v1.1.0"></a>
## [v1.1.0](https://github.com/comunica/sparqlee/compare/v1.0.0...v1.1.0) - 2019-07-29

### Added
* [Support xsd:date in datetime functions, Closes comunica/comunica#463](https://github.com/comunica/sparqlee/commit/a282f6406efd9380ec5bf2e3a95204d82d6738fc)

### Fixed
* [Fix typo.](https://github.com/comunica/sparqlee/commit/6cefc786a10080d65b171babc95ac06bab87a05e)
* [Package the bin/ dir](https://github.com/comunica/sparqlee/commit/e401eba5c92c3535a226f9d5dc29328a634d895f)

All notable changes to this project will be documented in this file.

<a name="1.0.0"></a>
## [1.0.0] - 2019-05-2

* Initial release
