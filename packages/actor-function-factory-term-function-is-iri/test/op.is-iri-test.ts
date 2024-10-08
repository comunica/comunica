import {
  ActorFunctionFactoryExpressionFunctionBnode,
} from '@comunica/actor-function-factory-expression-function-bnode';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionIsIri } from '../lib';

describe('like \'isIRI\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionIsIri(args),
      args => new ActorFunctionFactoryExpressionFunctionBnode(args),
    ],
    arity: 1,
    aliases: bool,
    notation: Notation.Function,
    operation: 'isIRI',
    testTable: `
        <http://example.com> = true
        BNODE() = false
        "foo" = false
      `,
  });
});

describe('like \'isURI\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionIsIri(args),
      args => new ActorFunctionFactoryExpressionFunctionBnode(args),
    ],
    arity: 1,
    aliases: bool,
    notation: Notation.Function,
    operation: 'isURI',
    testTable: `
        <http://example.com> = true
        BNODE() = false
        "foo" = false
      `,
  });
});
