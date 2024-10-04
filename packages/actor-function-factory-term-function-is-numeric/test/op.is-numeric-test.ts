import {
  ActorFunctionFactoryExpressionFunctionBnode,
} from '@comunica/actor-function-factory-expression-function-bnode';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionIsNumeric } from '../lib';

describe('like \'isNumeric\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionIsNumeric(args),
      args => new ActorFunctionFactoryExpressionFunctionBnode(args),
    ],
    arity: 1,
    aliases: bool,
    notation: Notation.Function,
    operation: 'isNumeric',
    testTable: `
        <http://example.com> = false
        BNODE() = false
        "foo" = false
        "foo"@fr = false
        1 = true
        "1"^^xsd:int = true
      `,
  });
});
