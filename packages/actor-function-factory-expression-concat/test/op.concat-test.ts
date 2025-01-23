import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryExpressionConcat } from '../lib';

describe('like \'concat\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionConcat(args),
    ],
    arity: 2,
    notation: Notation.Function,
    operation: 'CONCAT',
    testTable: `
    "abc"@en-us--ltr "def"@en-us--ltr = "abcdef"@en-us--ltr
    "abc"@en-us--ltr "def"@en-us--rtl = "abcdef"@en-us
    "abc"@en-us "def"@en-us--ltr = "abcdef"@en-us
    "abc" "def"@en-us--ltr = "abcdef"
    `,
  });
});
