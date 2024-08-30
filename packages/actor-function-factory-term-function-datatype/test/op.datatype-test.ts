import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionDatatype } from '../lib';

describe('like \'datatype\' receiving', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionDatatype(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'datatype',
    testTable: `
        "3"^^xsd:integer = http://www.w3.org/2001/XMLSchema#integer
        "a"^^xsd:string = http://www.w3.org/2001/XMLSchema#string
        '"plain literal"'  = http://www.w3.org/2001/XMLSchema#string
        "3"^^xsd:anyURI = http://www.w3.org/2001/XMLSchema#anyURI
      `,
    errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
  });
});
