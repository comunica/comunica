import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionUnaryMinus } from '../lib';

describe('evaluation of \'- (unary)\' like', () => {
  // '- "0"^^xsd:float       = "-0."^^xsd:float   ' // TODO: Document
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionUnaryMinus(args),
    ],
    arity: 1,
    operation: '-',
    notation: Notation.Prefix,
    testTable: `
        "3"^^xsd:integer     = "-3"^^xsd:integer
        "3"^^xsd:decimal     = "-3"^^xsd:decimal
        "3"^^xsd:float       = "-3"^^xsd:float
        "3"^^xsd:double      = "-3.0E0"^^xsd:double
        "0"^^xsd:integer     = "0"^^xsd:integer
        "-10.5"^^xsd:decimal = "10.5"^^xsd:decimal
        "NaN"^^xsd:float     = "NaN"^^xsd:float
        "-0"^^xsd:float      = "0"^^xsd:float
        "-INF"^^xsd:float    = "INF"^^xsd:float
        "INF"^^xsd:float     = "-INF"^^xsd:float
      `,
  });
});
