import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermRegex } from '../lib';

describe('evaluation of \'regex\' like', () => {
  // TODO: Test better
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermRegex(args),
    ],
    arity: 'vary',
    operation: 'regex',
    notation: Notation.Function,
    aliases: bool,
    testTable: `
      "simple" "simple" = true
      "aaaaaa" "a" = true
      "simple" "blurgh" = false
      "aaa" "a+" = true
      "AAA" "a+" = false
      "AAA" "a+" "i" = true
      "a\\na" ".+" "s" = true
      "a\\nb\\nc" "^b$" = false
      "a\\nb\\nc" "^b$" "m" = true
      `,
  });
});
