import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermXsdToDecimal } from '../lib';

describe('to decimal', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermXsdToDecimal(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:decimal',
    testTable: `
        "+33.3300" = "33.33"^^xsd:decimal
        "0.0" = "0"^^xsd:decimal
        "0" = "0"^^xsd:decimal
        "1.5" = "1.5"^^xsd:decimal
        "1" = "1"^^xsd:decimal
        "13" = "13"^^xsd:decimal
        "true"^^xsd:boolean = "1"^^xsd:decimal
        "false"^^xsd:boolean = "0"^^xsd:decimal
        "1"^^xsd:boolean = "1"^^xsd:decimal
        "0"^^xsd:boolean = "0"^^xsd:decimal
        "0"^^xsd:integer = "0"^^xsd:decimal
        "1"^^xsd:integer = "1"^^xsd:decimal
        "-1"^^xsd:integer = "-1"^^xsd:decimal
        "0.0"^^xsd:decimal = "0"^^xsd:decimal
        "1.0"^^xsd:decimal = "1"^^xsd:decimal
        "-1.0"^^xsd:decimal = "-1"^^xsd:decimal
        "0.0"^^xsd:double = "0"^^xsd:decimal
        "1.0"^^xsd:double = "1"^^xsd:decimal
        "0E1"^^xsd:double = "0"^^xsd:decimal
        "1E0"^^xsd:double = "1"^^xsd:decimal
        "0E1"^^xsd:float = "0"^^xsd:decimal
        "1E0"^^xsd:float = "1"^^xsd:decimal
        "0.0"^^xsd:float = "0"^^xsd:decimal
        "1.0"^^xsd:float = "1"^^xsd:decimal
        "1.25"^^xsd:float = "1.25"^^xsd:decimal
        "-7.875"^^xsd:float = "-7.875"^^xsd:decimal
        "2.5"^^xsd:decimal = "2.5"^^xsd:decimal
        "-2.5"^^xsd:decimal = "-2.5"^^xsd:decimal
        "42"^^xsd:untypedAtomic = "42"^^xsd:decimal
        "37.5"^^xsd:untypedAtomic = "37.5"^^xsd:decimal
      `,
    errorTable: `
        "http://example.org/z"^^xsd:string = 'Invalid cast'
        <http://example.org/z> = 'Argument types not valid for operator'
        "string"^^xsd:string = 'Invalid cast'
        "-10.2E3"^^xsd:string = 'Invalid cast'
        "0E1"^^xsd:string = 'Invalid cast'
        "1E0"^^xsd:string = 'Invalid cast'
        "2002-10-10T17:00:00Z"^^xsd:string = 'Invalid cast'
        "true"^^xsd:string = 'Invalid cast'
        "false"^^xsd:string = 'Invalid cast'
        "foo"^^xsd:decimal = 'Invalid lexical form'
        "NaN"^^xsd:double = 'Invalid cast'
        "+INF"^^xsd:double = 'Invalid cast'
        "-INF"^^xsd:double = 'Invalid cast'
        "invalid"^^xsd:untypedAtomic = 'Invalid cast'
      `,
  });
});
