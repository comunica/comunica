import { ActorFunctionFactoryTermStrLangdir } from '@comunica/actor-function-factory-term-str-langdir';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';

describe('like \'strlangdir\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStrLangdir(args),
    ],
    arity: 3,
    notation: Notation.Function,
    operation: 'strlangdir',
    testTable: `
      "abc" "fr" "ltr" = "abc"@fr--ltr
      "abc" "fr" "rtl" = "abc"@fr--rtl
    `,
    errorTable: `
    "abc" "" "LTR" = 'Unable to create directional language string for empty languages'
    "abc" "en-US" "LTR" = 'Unable to create directional language string for direction "LTR"'
    "abc" "en-US" "" = 'Unable to create directional language string for direction ""'
    "abc" "en-US" "rtll" = 'Unable to create directional language string for direction "rtll"'
    `,
  });
});
