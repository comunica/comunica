import { DataFactory } from 'rdf-data-factory';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

const DF = new DataFactory();

// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('evaluations of \'bnode\' with custom blank node generator function', () => {
  const legacyContext: Partial<any> = {
    bnode: async(input?: string) => DF.blankNode(`${input || 'b'}cd`),
  };

  runTestTable({
    operation: 'BNODE',
    legacyContext,
    arity: 1,
    notation: Notation.Function,
    testTable: `
    '' = _:BNODE_0
    "" = _:BNODE_1
    "hello" = _:hello
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
