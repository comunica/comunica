import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { error, merge, numeric } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionMultiplication } from '../lib';

const config: FuncTestTableConfig<object> = {
  registeredActors: [
    args => new ActorFunctionFactoryTermFunctionMultiplication(args),
  ],
  arity: 2,
  operation: '*',
  aliases: merge(numeric, error),
  notation: Notation.Infix,
};

describe('evaluation of \'*\' like', () => {
  runFuncTestTable({
    ...config,
    testTable: `
      0i 0i = 0i
      0i 1i = 0i
      1i 2i = 2i
      3i 4i = 12i
    
      -0f -0f =  0f
      -0f -1f =  0f
      -1f -2f =  2f
      -3f  4f = -12f
       2f  6f =  12f
    
       0f   INF =  NaN
      -INF  0i  =  NaN
       INF -INF = -INF
       3i   INF =  INF
      -INF  6f  = -INF
      -INF -3f  =  INF
    
      NaN    NaN    = NaN
      NaN    anyNum = NaN
      anyNum NaN    = NaN
    `,
    errorTable: `
      anyNum error = 'Argument types not valid for operator'
      error  anyNum   = 'Argument types not valid for operator'
      error  error = 'Argument types not valid for operator'
    `,
  });
});
