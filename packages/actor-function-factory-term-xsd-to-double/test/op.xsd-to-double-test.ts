import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermXsdToDouble } from '../lib';

describe('to double', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermXsdToDouble(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:double',
    testTable: `
        "-10.2E3" = "-1.02E4"^^xsd:double
        "+33.3300" = "3.333E1"^^xsd:double
        "0.0" = "0.0E0"^^xsd:double
        "0" = "0.0E0"^^xsd:double
        "0E1" = "0.0E0"^^xsd:double
        "1.5" = "1.5E0"^^xsd:double
        "1" = "1.0E0"^^xsd:double
        "1E0" = "1.0E0"^^xsd:double
        "13" = "1.3E1"^^xsd:double
        "true"^^xsd:boolean = "1.0E0"^^xsd:double
        "false"^^xsd:boolean = "0.0E0"^^xsd:double
        "1"^^xsd:boolean = "1.0E0"^^xsd:double
        "0"^^xsd:boolean = "0.0E0"^^xsd:double
        "0"^^xsd:integer = "0.0E0"^^xsd:double
        "1"^^xsd:integer = "1.0E0"^^xsd:double
        "-1"^^xsd:integer = "-1.0E0"^^xsd:double
        "0.0"^^xsd:decimal = "0.0E0"^^xsd:double
        "1.0"^^xsd:decimal = "1.0E0"^^xsd:double
        "-1.0"^^xsd:decimal = "-1.0E0"^^xsd:double
        "0E1"^^xsd:double = "0.0E0"^^xsd:double
        "1E0"^^xsd:double = "1.0E0"^^xsd:double
        "0.0"^^xsd:float = "0.0E0"^^xsd:double
        "1.0"^^xsd:float = "1.0E0"^^xsd:double
        "1.25"^^xsd:float = "1.25E0"^^xsd:double
        "-7.875"^^xsd:float = "-7.875E0"^^xsd:double
        "2.5"^^xsd:decimal = "2.5E0"^^xsd:double
        "-2.5"^^xsd:decimal = "-2.5E0"^^xsd:double
        "NaN" = "NaN"^^xsd:double
        "INF" = "INF"^^xsd:double
        "+INF" = "INF"^^xsd:double
        "-INF" = "-INF"^^xsd:double
      `,
    errorTable: `
        "http://example.org/z"^^xsd:string = 'Invalid cast'
        "string"^^xsd:string = 'Invalid cast'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Invalid cast'
        "true"^^xsd:string = 'Invalid cast'
        "false"^^xsd:string = 'Invalid cast'
        "foo"^^xsd:double = 'Invalid lexical form'
      `,
  });
});
