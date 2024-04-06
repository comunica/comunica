import { bool, merge, numeric } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { runFuncTestTable } from '../util';

describe('evaluations of \'IN\'', () => {
  runFuncTestTable({
    operation: 'IN',
    arity: 2,
    notation: Notation.Infix,
    aliases: merge(numeric, bool),
    testTable: `
      1 (2,1,3) = true
      1 (2,1.0,3) = true
      1 (2,3) = false
      1 (?a,1) = true
    `,
    errorTable: `
      1 (?a) = 'Some argument to IN errorred and none where equal.'
    `,
  });

  runFuncTestTable({
    operation: 'NOT IN',
    arity: 2,
    notation: Notation.Infix,
    aliases: merge(numeric, bool),
    testTable: `
      1 (2,1,3) = false
      1 (2,1.0,3) = false
      1 (2,3) = true
      1 (?a,1) = false
    `,
    errorTable: `
      1 (?a) = 'Some argument to IN errorred and none where equal.'
    `,
  });
});
