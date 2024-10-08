import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool, error, merge } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryExpressionFunctionLogicalOr } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryExpressionFunctionLogicalOr(args),
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
