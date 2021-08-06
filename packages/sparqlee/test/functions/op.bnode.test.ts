import { DataFactory } from 'rdf-data-factory';
import type { ISyncEvaluatorConfig } from '../../lib/evaluators/SyncEvaluator';
import { Notation } from '../util/TestTable';
import { runTestTable } from '../util/utils';

const DF = new DataFactory();

describe('evaluations of \'bnode\' with custom blank node generator function', () => {
  const config: ISyncEvaluatorConfig = {
    bnode: (input?: string) => DF.blankNode(`${input || 'b'}cd`),
  };
  runTestTable({
    operation: 'BNODE',
    config: { type: 'sync', config },
    arity: 1,
    notation: Notation.Function,
    testTable: `
    '' = _:bcd
    "" = _:bcd
    "hello" = _:hellocd
    `,
  });
});
