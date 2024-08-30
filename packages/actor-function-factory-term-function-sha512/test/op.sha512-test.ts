import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionSha512 } from '../lib';

describe('evaluation of \'sha512\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionSha512(args),
    ],
    arity: 1,
    operation: 'sha512',
    notation: Notation.Function,
    testTable: `
        "foo" = "f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7"
      `,
    errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
  });
});
