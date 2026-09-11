import {
  runFuncTestTable,
  Notation,
} from '@comunica/utils-jest';
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
        "+1"^^xsd:integer = "1"
        "-1"^^xsd:integer = "-1"
        "0"^^xsd:integer = "0"
        "+0"^^xsd:integer = "0"
        "-0"^^xsd:integer = "0"
        "+1000000"^^xsd:integer = "1000000"
        "-1000000"^^xsd:integer = "-1000000"

        "1"^^xsd:decimal = "1"
        "1.0"^^xsd:decimal = "1"
        "+1.0"^^xsd:decimal = "1"
        "-1.0"^^xsd:decimal = "-1"
        "0"^^xsd:decimal = "0"
        "0.0"^^xsd:decimal = "0"
        "+0.0"^^xsd:decimal = "0"
        "-0.0"^^xsd:decimal = "0"
        "2.5"^^xsd:decimal = "2.5"
        "+2.5"^^xsd:decimal = "2.5"
        "-2.5"^^xsd:decimal = "-2.5"
        "+1000000.0"^^xsd:decimal = "1000000"
        "-1000000.0"^^xsd:decimal = "-1000000"
        "+1000000.1"^^xsd:decimal = "1000000.1"
        "-1000000.1"^^xsd:decimal = "-1000000.1"

        "1E0"^^xsd:double = "1"
        "1"^^xsd:double = "1"
        "1.0"^^xsd:double = "1"
        "+1.0"^^xsd:double = "1"
        "-1.0"^^xsd:double = "-1"
        "+1.1"^^xsd:double = "1.1"
        "-1.1"^^xsd:double = "-1.1"
        "0E1"^^xsd:double = "0"
        "0"^^xsd:double = "0"
        "0.0"^^xsd:double = "0"
        "+0.0"^^xsd:double = "0"
        "-0.0"^^xsd:double = "0"
        "1.25"^^xsd:double = "1.25"
        "+1.25"^^xsd:double = "1.25"
        "-1.25"^^xsd:double = "-1.25"
        "+11.0"^^xsd:double = "11"
        "-11.0"^^xsd:double = "-11"
        "+0.01"^^xsd:double = "0.01"
        "-0.01"^^xsd:double = "-0.01"
        "+0.0000001"^^xsd:double = "1.0E-7"
        "-0.0000001"^^xsd:double = "-1.0E-7"
        "+0.000001"^^xsd:double = "0.000001"
        "-0.000001"^^xsd:double = "-0.000001"
        "+999999.0"^^xsd:double = "999999"
        "-999999.0"^^xsd:double = "-999999"
        "+1000000.0"^^xsd:double = "1.0E6"
        "-1000000.0"^^xsd:double = "-1.0E6"
        "INF"^^xsd:double = "INF"
        "-INF"^^xsd:double = "-INF"
        "NaN"^^xsd:double = "NaN"

        "1E0"^^xsd:float = "1"
        "1"^^xsd:float = "1"
        "1.0"^^xsd:float = "1"
        "+1.0"^^xsd:float = "1"
        "-1.0"^^xsd:float = "-1"
        "+1.1"^^xsd:float = "1.1"
        "-1.1"^^xsd:float = "-1.1"
        "0E0"^^xsd:float = "0"
        "0"^^xsd:float = "0"
        "0.0"^^xsd:float = "0"
        "+0.0"^^xsd:float = "0"
        "-0.0"^^xsd:float = "0"
        "1.25"^^xsd:float = "1.25"
        "+1.25"^^xsd:float = "1.25"
        "-1.25"^^xsd:float = "-1.25"
        "+11.0"^^xsd:float = "11"
        "-11.0"^^xsd:float = "-11"
        "+0.01"^^xsd:float = "0.01"
        "-0.01"^^xsd:float = "-0.01"
        "+0.0000001"^^xsd:float = "1.0E-7"
        "-0.0000001"^^xsd:float = "-1.0E-7"
        "+0.000001"^^xsd:float = "0.000001"
        "-0.000001"^^xsd:float = "-0.000001"
        "+999999.0"^^xsd:float = "999999"
        "-999999.0"^^xsd:float = "-999999"
        "+1000000.0"^^xsd:float = "1.0E6"
        "-1000000.0"^^xsd:float = "-1.0E6"
        "INF"^^xsd:float = "INF"
        "-INF"^^xsd:float = "-INF"
        "NaN"^^xsd:float = "NaN"
      `,
  });
});
