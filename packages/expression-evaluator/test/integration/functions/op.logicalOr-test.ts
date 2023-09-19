import { bool, error, merge } from '../../util/Aliases';

import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
import { runTestTable } from '../../util/utils';

const config: ITestTableConfigBase = {
  operation: '||',
  arity: 2,
  aliases: merge(bool, error),
  notation: Notation.Infix,
};

describe('evaluation of "||" like', () => {
  runTestTable({
    // Test all cases of: https://www.w3.org/TR/sparql11-query/#evaluation
    ...config,
    testTable: `
      true  true  = true
      true  false = true
      false true  = true
      false false = false
      true  invalidDateTime = true
      invalidDateTime true  = true
    `,
    errorTable: `
      false invalidDateTime = 'Cannot coerce term to EBV'
      invalidDateTime false = 'Cannot coerce term to EBV'
      invalidDateTime invalidDateTime = 'Cannot coerce term to EBV'
    `,
  });
});
