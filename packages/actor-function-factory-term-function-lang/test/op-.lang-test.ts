import { ActorFunctionFactoryTermFunctionLang } from '@comunica/actor-function-factory-term-function-lang';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';

describe('like \'lang\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionLang(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'lang',
    testTable: `
        "a"@fr = "fr"
        "a" = ""
      `,
    errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
  });
});
