import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermXsdToString } from '../lib';

describe('to string', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermXsdToString(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:string',
    testTable: `
        "http://example.org/z" = "http://example.org/z"
        <http://example.org/z> = "http://example.org/z"
        "true"^^xsd:boolean = "true"
        "false"^^xsd:boolean = "false"
        "1"^^xsd:boolean = "true"
        "0"^^xsd:boolean = "false"
        "1"^^xsd:integer = "1"
        "0.0"^^xsd:decimal = "0"
        "-1.0"^^xsd:decimal = "-1"
        "0E1"^^xsd:double = "0"
        "1E0"^^xsd:double = "1"
        "1E0"^^xsd:float = "1"
        "1.25"^^xsd:float = "1.25"
        "2.5"^^xsd:decimal = "2.5"
        "-2.5"^^xsd:decimal = "-2.5"
      `,
  });
});
