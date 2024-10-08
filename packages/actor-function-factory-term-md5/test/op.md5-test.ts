import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionMd5 } from '../lib';

describe('evaluation of \'md5\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionMd5(args),
    ],
    arity: 1,
    operation: 'md5',
    notation: Notation.Function,
    testTable: `
        "foo" = "acbd18db4cc2f85cedef654fccc4a4d8"
      `,
    errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
  });
});
