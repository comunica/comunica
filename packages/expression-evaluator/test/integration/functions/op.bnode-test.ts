import { DataFactory } from 'rdf-data-factory';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

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
