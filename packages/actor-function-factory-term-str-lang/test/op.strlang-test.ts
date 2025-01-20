import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermStrLang } from '../lib';

describe('like \'strlang\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStrLang(args),
    ],
    arity: 2,
    notation: Notation.Function,
    operation: 'strlang',
    errorTable: `
    "abc" "" = 'Unable to create language string for empty languages'
    `,
  });
});
