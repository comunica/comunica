import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermXsdToFloat } from '../lib';

describe('to float', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermXsdToFloat(args),
    ],
    arity: 1,
    operation: 'xsd:float',
    notation: Notation.Function,
    testTable: `
        "-10.2E3" = "-10200"^^xsd:float'
        "+33.3300" = "33.33"^^xsd:float'
        "0.0" = "0"^^xsd:float'
        "0" = "0"^^xsd:float'
        "0E1" = "0"^^xsd:float'
        "1.5" = "1.5"^^xsd:float'
        "1" = "1"^^xsd:float'
        "1E0" = "1"^^xsd:float'
        "13" = "13"^^xsd:float'
        "true"^^xsd:boolean = "1"^^xsd:float'
        "false"^^xsd:boolean = "0"^^xsd:float'
        "1"^^xsd:boolean = "1"^^xsd:float'
        "0"^^xsd:boolean = "0"^^xsd:float'
        "0"^^xsd:integer = "0"^^xsd:float'
        "1"^^xsd:integer = "1"^^xsd:float'
        "-1"^^xsd:integer = "-1"^^xsd:float'
        "0.0"^^xsd:decimal = "0"^^xsd:float'
        "1.0"^^xsd:decimal = "1"^^xsd:float'
        "-1.0"^^xsd:decimal = "-1"^^xsd:float'
        "0E1"^^xsd:double = "0"^^xsd:float'
        "1E0"^^xsd:double = "1"^^xsd:float'
        "0.0"^^xsd:float = "0"^^xsd:float'
        "1.0"^^xsd:float = "1"^^xsd:float'
        "1.25"^^xsd:float = "1.25"^^xsd:float'
        "-7.875"^^xsd:float = "-7.875"^^xsd:float'
        "2.5"^^xsd:decimal = "2.5"^^xsd:float'
        "-2.5"^^xsd:decimal = "-2.5"^^xsd:float'
        "NaN" = "NaN"^^xsd:float'
        "INF" = "INF"^^xsd:float'
        "+INF" = "INF"^^xsd:float'
        "-INF" = "-INF"^^xsd:float'
      `,
    errorTable: `
        "http://example.org/z"^^xsd:string = 'Invalid cast'
        "string"^^xsd:string = 'Invalid cast'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Invalid cast'
        "true"^^xsd:string = 'Invalid cast'
        "false"^^xsd:string = 'Invalid cast'
        "foo"^^xsd:float = 'Invalid lexical form'
      `,
  });
});
