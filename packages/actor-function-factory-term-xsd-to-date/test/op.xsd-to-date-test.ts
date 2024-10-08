import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermXsdToDate } from '../lib';

describe('to date', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermXsdToDate(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:date',
    testTable: `
        "1999-03-17T06:00:00Z"^^xsd:dateTime = "1999-03-17Z"^^xsd:date
        "1999-03-17T06:00:00"^^xsd:dateTime = "1999-03-17"^^xsd:date
        "1999-03-17T06:00:00+07:25"^^xsd:dateTime = "1999-03-17+07:25"^^xsd:date
        "1999-03-17T06:00:00-07:25"^^xsd:dateTime = "1999-03-17-07:25"^^xsd:date
        
        "1999-03-17"^^xsd:date = "1999-03-17"^^xsd:date
        "1999-03-17Z"^^xsd:date = "1999-03-17Z"^^xsd:date
      `,
    errorTable: `
        "1999-03-17ZZ"^^xsd:date = 'Invalid lexical form'
      `,
  });
});
