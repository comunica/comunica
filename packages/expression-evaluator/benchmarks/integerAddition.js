"use strict";
// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable no-console */
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable-next-line import/no-extraneous-dependencies
const bindings_factory_1 = require("@comunica/bindings-factory");
// eslint-disable-next-line import/no-extraneous-dependencies
const benchmark_1 = require("benchmark");
// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
const Benchmark = require("benchmark");
const rdf_data_factory_1 = require("rdf-data-factory");
const sparqlalgebrajs_1 = require("sparqlalgebrajs");
const lib_1 = require("../lib");
const Consts_1 = require("../lib/util/Consts");
const Aliases_1 = require("../test/util/Aliases");
const benchSuite = new benchmark_1.Suite();
const DF = new rdf_data_factory_1.DataFactory();
const BF = new bindings_factory_1.BindingsFactory({});
function integerTerm(int) {
    return DF.literal(int.toString(), DF.namedNode(Consts_1.TypeURL.XSD_INTEGER));
}
const benchmark = new Benchmark('bench addition', () => {
    const query = (0, sparqlalgebrajs_1.translate)((0, Aliases_1.template)('?a + ?b = ?c'));
    const evaluator = new lib_1.SyncEvaluator(query.input.expression);
    const max = 100;
    for (let fst = 0; fst < max; fst++) {
        for (let snd = 0; snd < max; snd++) {
            evaluator.evaluate(BF.bindings([
                [DF.variable('a'), integerTerm(fst)],
                [DF.variable('b'), integerTerm(snd)],
                [DF.variable('c'), integerTerm(fst + snd)],
            ]));
        }
    }
});
benchSuite.push(benchmark);
benchSuite.on('cycle', (event) => {
    console.log(String(event.target));
}).on('complete', () => {
    console.log(`Mean execution time ${benchmark.stats.mean}`);
}).run({ async: true });
//# sourceMappingURL=integerAddition.js.map