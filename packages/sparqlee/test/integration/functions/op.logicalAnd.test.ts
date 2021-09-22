import { bool, error, merge } from '../../util/Aliases';

import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
import { runTestTable } from '../../util/utils';

const config: ITestTableConfigBase = {
  operation: '&&',
  arity: 2,
  aliases: merge(bool, error),
  notation: Notation.Infix,
};

describe('evaluation of "&&" like', () => {
  runTestTable({
    ...config,
    testTable: `
      true  true  = true
      true  false = false
      false true  = false
      false false = false
      false error = false
      error false = false
    `,
    errorTable: `
      true  error = 'Cannot coerce term to EBV'
      error true  = 'Cannot coerce term to EBV'
      error error = 'Cannot coerce term to EBV'
    `,
  });
});
