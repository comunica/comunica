import {
  ActorFunctionFactoryExpressionBnode,
} from '@comunica/actor-function-factory-expression-bnode';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermIsNumeric } from '../lib';

describe('like \'isNumeric\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermIsNumeric(args),
      args => new ActorFunctionFactoryExpressionBnode(args),
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
