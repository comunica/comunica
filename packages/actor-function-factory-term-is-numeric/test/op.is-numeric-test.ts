import {
  ActorFunctionFactoryExpressionBnode,
} from '@comunica/actor-function-factory-expression-bnode';
import {
  runFuncTestTable,
  bool,
  Notation,
} from '@comunica/utils-jest';
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
        "12"^^xsd:nonNegativeInteger = true
        "127"^^xsd:byte = true
        "1200"^^xsd:byte = false
        "-1"^^xsd:nonNegativeInteger = false
        "1.5"^^xsd:integer = false
        "a"^^xsd:integer = false
        "1e3"^^xsd:decimal = false
        "a"^^xsd:double = false
      `,
  });
});
