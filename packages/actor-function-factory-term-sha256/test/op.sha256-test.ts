import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermSha256 } from '../lib';

describe('evaluation of \'sha256\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermSha256(args),
    ],
    arity: 1,
    operation: 'sha256',
    notation: Notation.Function,
    testTable: `
        "foo" = "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
      `,
    errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
  });
});
