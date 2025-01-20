import { ActorFunctionFactoryTermLangdir } from '@comunica/actor-function-factory-term-langdir';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';

describe('like \'langdir\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermLangdir(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'langdir',
    testTable: `
        "a"@fr = ""
        "a"@fr--ltr = "ltr"
        "a"@fr--rtl = "rtl"
        "a" = ""
      `,
    errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
  });
});
