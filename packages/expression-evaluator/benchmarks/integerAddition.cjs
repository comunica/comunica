"use strict";

var _bindingsFactory = require("@comunica/bindings-factory");
var _benchmark = require("benchmark");
var _rdfDataFactory = require("rdf-data-factory");
var _sparqlalgebrajs = require("sparqlalgebrajs");
var _index = require("../lib/index.cjs");
var _Consts = require("../lib/util/Consts.cjs");
var _Aliases = require("../test/util/Aliases.cjs");
/* eslint-disable no-console */
// eslint-disable-next-line import/no-extraneous-dependencies
// eslint-disable-next-line import/no-extraneous-dependencies
// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
// eslint-disable-next-line ts/no-require-imports
const Benchmark = require('benchmark');
const benchSuite = new _benchmark.Suite();
const DF = new _rdfDataFactory.DataFactory();
const BF = new _bindingsFactory.BindingsFactory(DF);
function integerTerm(int) {
  return DF.literal(int.toString(), DF.namedNode(_Consts.TypeURL.XSD_INTEGER));
}
const benchmark = new Benchmark('bench addition', () => {
  const query = (0, _sparqlalgebrajs.translate)((0, _Aliases.template)('?a + ?b = ?c'));
  const evaluator = new _index.SyncEvaluator(DF, query.input.expression);
  const max = 100;
  for (let fst = 0; fst < max; fst++) {
    for (let snd = 0; snd < max; snd++) {
      evaluator.evaluate(BF.bindings([[DF.variable('a'), integerTerm(fst)], [DF.variable('b'), integerTerm(snd)], [DF.variable('c'), integerTerm(fst + snd)]]));
    }
  }
});
benchSuite.push(benchmark);
benchSuite.on('cycle', event => {
  console.log(String(event.target));
}).on('complete', () => {
  console.log(`Mean execution time ${benchmark.stats.mean}`);
}).run({
  async: true
});