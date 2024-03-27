import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runTestTable } from '@comunica/expression-evaluator/test/util/utils';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory();

describe('evaluations of \'bnode\' with custom blank node generator function', () => {
  runTestTable({
    operation: 'BNODE',
    arity: 1,
    notation: Notation.Function,
    errorTable: `
    1 = 'Argument types not valid for operator'
    `,
  });
});
