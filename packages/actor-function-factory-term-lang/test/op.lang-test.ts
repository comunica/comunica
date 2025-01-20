import { ActorFunctionFactoryTermLang } from '@comunica/actor-function-factory-term-lang';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';

describe('like \'lang\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermLang(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'lang',
    testTable: `
        "a"@fr = "fr"
        "a"@fr--ltr = "fr"
        "a" = ""
      `,
    errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
  });
});
