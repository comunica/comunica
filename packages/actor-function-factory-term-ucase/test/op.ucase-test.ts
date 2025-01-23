import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermUcase } from '../lib';

describe('like \'ucase\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermUcase(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'UCASE',
    testTable: `
    "abc"@en-us--ltr = "ABC"@en-us--ltr
    "abc"@en-us = "ABC"@en-us
    "abc" = "ABC"
    `,
  });
});
