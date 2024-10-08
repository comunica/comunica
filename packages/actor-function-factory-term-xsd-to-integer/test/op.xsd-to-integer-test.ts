import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToInteger } from '../lib';

describe('to integer', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionXsdToInteger(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:integer',
    testTable: `
        "0" = "0"^^xsd:integer
        "1" = "1"^^xsd:integer
        "13" = "13"^^xsd:integer
        "true"^^xsd:boolean = "1"^^xsd:integer
        "false"^^xsd:boolean = "0"^^xsd:integer
        "1"^^xsd:boolean = "1"^^xsd:integer
        "0"^^xsd:boolean = "0"^^xsd:integer
        "0"^^xsd:integer = "0"^^xsd:integer
        "1"^^xsd:integer = "1"^^xsd:integer
        "-1"^^xsd:integer = "-1"^^xsd:integer
        "0.0"^^xsd:decimal = "0"^^xsd:integer
        "1.0"^^xsd:decimal = "1"^^xsd:integer
        "-1.0"^^xsd:decimal = "-1"^^xsd:integer
        "0E1"^^xsd:double = "0"^^xsd:integer
        "1E0"^^xsd:double = "1"^^xsd:integer
        "0.0"^^xsd:float = "0"^^xsd:integer
        "1.0"^^xsd:float = "1"^^xsd:integer
        "1.25"^^xsd:float = "1"^^xsd:integer
        "-7.875"^^xsd:float = "-7"^^xsd:integer
        "2.5"^^xsd:decimal = "2"^^xsd:integer
        "-2.5"^^xsd:decimal = "-2"^^xsd:integer
      `,
    errorTable: `
        "-10.2E3"^^xsd:string = 'Invalid cast'
        "+33.3300"^^xsd:string = 'Invalid cast'
        "0.0"^^xsd:string = 'Invalid cast'
        "0E1"^^xsd:string = 'Invalid cast'
        "1.5"^^xsd:string = 'Invalid cast'
        "1E0"^^xsd:string = 'Invalid cast'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Invalid cast'
        "false"^^xsd:string = 'Invalid cast'
        "true"^^xsd:string = 'Invalid cast'
        "foo"^^xsd:integer = 'Invalid lexical form'
        "NaN"^^xsd:double = 'Invalid cast'
        "+INF"^^xsd:double = 'Invalid cast'
        "-INF"^^xsd:double = 'Invalid cast'
      `,
  });
});
