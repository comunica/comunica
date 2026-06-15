import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-jest';
import { ActorFunctionFactoryTermLcase } from '../lib';

describe('like \'lcase\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermLcase(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'LCASE',
    testTable: `
    "ABC"@en-us--ltr = "abc"@en-us--ltr
    "ABC"@en-us = "abc"@en-us
    "ABC" = "abc"
    `,
  });
});
