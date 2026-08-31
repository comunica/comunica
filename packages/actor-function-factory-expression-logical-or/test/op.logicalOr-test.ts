import type { FuncTestTableConfig } from '@comunica/utils-jest';
import {
  runFuncTestTable,
  bool,
  error,
  merge,
  Notation,
} from '@comunica/utils-jest';

import { ActorFunctionFactoryExpressionLogicalOr } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryExpressionLogicalOr(args),
  ],
  operation: '||',
  arity: 2,
  aliases: merge(bool, error),
  notation: Notation.Infix,
};

describe('evaluation of "||" like', () => {
  runFuncTestTable({
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
