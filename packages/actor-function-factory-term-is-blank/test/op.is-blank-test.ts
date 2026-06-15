import {
  ActorFunctionFactoryExpressionBnode,
} from '@comunica/actor-function-factory-expression-bnode';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import {
  bool,
  Notation,
} from '@comunica/utils-jest';


import { ActorFunctionFactoryTermIsBlank } from '../lib';

describe('like \'isBlank\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermIsBlank(args),
      args => new ActorFunctionFactoryExpressionBnode(args),
    ],
    arity: 1,
    aliases: bool,
    notation: Notation.Function,
    operation: 'isBlank',
    testTable: `
        <http://example.com> = false
        BNODE() = true
        "foo" = false
      `,
  });
});
