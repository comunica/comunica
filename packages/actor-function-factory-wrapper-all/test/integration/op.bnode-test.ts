import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { DataFactory } from 'rdf-data-factory';
import { runFuncTestTable } from '../util';

const DF = new DataFactory();

describe('evaluations of \'bnode\' with custom blank node generator function', () => {
  runFuncTestTable({
    operation: 'BNODE',
    arity: 1,
    notation: Notation.Function,
    errorTable: `
    1 = 'Argument types not valid for operator'
    `,
  });
});
