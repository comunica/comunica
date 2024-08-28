import { bool, error, merge } from '@comunica/expression-evaluator/test/util/Aliases';

import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import type { ITestTableConfigBase } from '@comunica/expression-evaluator/test/util/utils';
import { runFuncTestTable } from '../../../bus-function-factory/test/util';

const config: ITestTableConfigBase = {
  operation: '&&',
  arity: 2,
  aliases: merge(bool, error),
  notation: Notation.Infix,
};

describe('evaluation of "&&" like', () => {
  runFuncTestTable({
    // Test all cases of: https://www.w3.org/TR/sparql11-query/#evaluation
    ...config,
    testTable: `
      true  true  = true
      true  false = false
      false true  = false
      false false = false
      false invalidDateTime = false
      invalidDateTime false = false
    `,
    errorTable: `
      true  invalidDateTime = 'Cannot coerce term to EBV'
      invalidDateTime true  = 'Cannot coerce term to EBV'
      invalidDateTime invalidDateTime = 'Cannot coerce term to EBV'
    `,
  });
});
