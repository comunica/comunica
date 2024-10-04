import {
  ActorFunctionFactoryExpressionFunctionBnode,
} from '@comunica/actor-function-factory-expression-function-bnode';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionIsLiteral } from '../lib';

describe('like \'isLiteral\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionIsLiteral(args),
      args => new ActorFunctionFactoryExpressionFunctionBnode(args),
    ],
    arity: 1,
    aliases: bool,
    notation: Notation.Function,
    operation: 'isLiteral',
    testTable: `
        <http://example.com> = false
        BNODE() = false
        "foo" = true
        "foo"@fr = true
      `,
  });
});
