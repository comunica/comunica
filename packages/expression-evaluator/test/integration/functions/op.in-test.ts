import { bool, merge, numeric } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluations of \'IN\'', () => {
  runTestTable({
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

  runTestTable({
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
