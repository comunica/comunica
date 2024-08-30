import {
  ActorFunctionFactoryExpressionFunctionBnode,
} from '@comunica/actor-function-factory-expression-function-bnode';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionIsBlank } from '../lib';

describe('like \'isBlank\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionIsBlank(args),
      args => new ActorFunctionFactoryExpressionFunctionBnode(args),
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
