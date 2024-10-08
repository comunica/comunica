import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionUnaryPlus } from '../lib';

describe('evaluation of \'+ (unary)\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionUnaryPlus(args),
    ],
    arity: 1,
    operation: '+',
    notation: Notation.Prefix,
    testTable: `
        "3"^^xsd:integer     = "3"^^xsd:integer
        "3"^^xsd:decimal     = "3"^^xsd:decimal
        "3"^^xsd:float       = "3"^^xsd:float
        "3"^^xsd:double      = "3.0E0"^^xsd:double
        "-10.5"^^xsd:decimal = "-10.5"^^xsd:decimal
        "NaN"^^xsd:float     = "NaN"^^xsd:float
      `,
  });
});
