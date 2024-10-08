import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToBoolean } from '../lib';

describe('to boolean', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionXsdToBoolean(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:boolean',
    testTable: `
        "0" = "false"^^xsd:boolean
        "1" = "true"^^xsd:boolean
        "false" = "false"^^xsd:boolean
        "true" = "true"^^xsd:boolean
        "0"^^xsd:boolean = "false"^^xsd:boolean
        "1"^^xsd:boolean = "true"^^xsd:boolean
        "false"^^xsd:boolean = "false"^^xsd:boolean
        "true"^^xsd:boolean = "true"^^xsd:boolean
        "0"^^xsd:integer = "false"^^xsd:boolean
        "1"^^xsd:integer = "true"^^xsd:boolean
        "-1"^^xsd:integer = "true"^^xsd:boolean
        "0.0"^^xsd:decimal = "false"^^xsd:boolean
        "1.0"^^xsd:decimal = "true"^^xsd:boolean
        "-1.0"^^xsd:decimal = "true"^^xsd:boolean
        "0E1"^^xsd:double = "false"^^xsd:boolean
        "1E0"^^xsd:double = "true"^^xsd:boolean
        "0E1"^^xsd:float = "false"^^xsd:boolean
        "1E0"^^xsd:float = "true"^^xsd:boolean
        "1.25"^^xsd:float = "true"^^xsd:boolean
        "-7.875"^^xsd:float = "true"^^xsd:boolean
        "2.5"^^xsd:decimal = "true"^^xsd:boolean
        "-2.5"^^xsd:decimal = "true"^^xsd:boolean
      `,
    errorTable: `
        "http://example.org/z"^^xsd:string = 'Invalid cast'
        "string"^^xsd:string = 'Invalid cast'
        "-10.2E3"^^xsd:string = 'Invalid cast'
        "+33.3300"^^xsd:string = 'Invalid cast'
        "0.0"^^xsd:string = 'Invalid cast'
        "0E1"^^xsd:string = 'Invalid cast'
        "1.5"^^xsd:string = 'Invalid cast'
        "1E0"^^xsd:string = 'Invalid cast'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Invalid cast'
        "foo"^^xsd:boolean = 'Invalid lexical form'
      `,
  });
});
