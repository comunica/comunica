import type { FuncTestTableConfig } from '@comunica/utils-jest';
import {
  runFuncTestTable,
  bool,
  error,
  merge,
  Notation,
} from '@comunica/utils-jest';

import { ActorFunctionFactoryExpressionLogicalAnd } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryExpressionLogicalAnd(args),
  ],
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
