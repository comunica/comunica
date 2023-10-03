import { DataFactory } from 'rdf-data-factory';
import type { IAsyncEvaluatorContext } from '../../../lib/evaluators/ExpressionEvaluator';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

const DF = new DataFactory();

describe('evaluations of \'bnode\' with custom blank node generator function', () => {
  const legacyContext: Partial<IAsyncEvaluatorContext> = {
    bnode: async(input?: string) => DF.blankNode(`${input || 'b'}cd`),
  };

  runTestTable({
    operation: 'BNODE',
    legacyContext,
    arity: 1,
    notation: Notation.Function,
    testTable: `
    '' = _:bcd
    "" = _:bcd
    "hello" = _:hellocd
    `,
    errorTable: `
    1 = 'Argument types not valid for operator'
    `,
  });

  runTestTable({
    operation: 'bnode',
    legacyContext,
    arity: 1,
    notation: Notation.Function,
    testTable: `
    '' = _:bcd
    `,
  });
});
