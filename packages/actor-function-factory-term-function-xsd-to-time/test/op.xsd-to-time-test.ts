import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToTime } from '../lib';

describe('to time', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionXsdToTime(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:time',
    testTable: `
        "1999-03-17T06:00:00Z"^^xsd:dateTime = "06:00:00Z"^^xsd:time
        "1999-03-17T06:00:00"^^xsd:dateTime = "06:00:00"^^xsd:time
        "1999-03-17T06:00:00+07:25"^^xsd:dateTime = "06:00:00+07:25"^^xsd:time
        "1999-03-17T06:00:00-07:25"^^xsd:dateTime = "06:00:00-07:25"^^xsd:time
        
        "06:00:00+07:25"^^xsd:time = "06:00:00+07:25"^^xsd:time
        "06:00:00"^^xsd:time = "06:00:00"^^xsd:time
      `,
    errorTable: `
        "06:00:00Z+00:00"^^xsd:time = 'Invalid lexical form'
      `,
  });
});
