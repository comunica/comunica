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
    ...config,
    testTable: `
      true  true  = true
      true  false = true
      false true  = true
      false false = false
      true  error = true
      error true  = true
    `,
    errorTable: `
      false error = 'Cannot coerce term to EBV'
      error false = 'Cannot coerce term to EBV'
      error error = 'Cannot coerce term to EBV'
    `,
  });
});
