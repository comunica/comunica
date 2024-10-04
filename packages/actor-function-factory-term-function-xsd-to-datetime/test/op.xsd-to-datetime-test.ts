import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToDatetime } from '../lib';

describe('to dateTime', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionXsdToDatetime(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:dateTime',
    testTable: `
        "1999-03-17T06:00:00Z"^^xsd:dateTime = "1999-03-17T06:00:00Z"^^xsd:dateTime
        "1999-03-17T06:00:00Z" = "1999-03-17T06:00:00Z"^^xsd:dateTime
        "1999-03-17T06:00:00+02:30" = "1999-03-17T06:00:00+02:30"^^xsd:dateTime
        "1999-03-17T06:00:00" = "1999-03-17T06:00:00"^^xsd:dateTime
        
        "1999-03-17Z"^^xsd:date = "1999-03-17T00:00:00Z"^^xsd:dateTime
        "1999-03-17"^^xsd:date = "1999-03-17T00:00:00"^^xsd:dateTime 
        "1999-03-17+07:25"^^xsd:date = "1999-03-17T00:00:00+07:25"^^xsd:dateTime
        "1999-03-17-07:25"^^xsd:date = "1999-03-17T00:00:00-07:25"^^xsd:dateTime
      `,
    errorTable: `
        "foo" = 'Failed to parse "foo"'
        "1234567789"^^xsd:integer = 'Argument types not valid for operator'
        "foo"^^xsd:dateTime = 'Invalid lexical form'
        "1999-03-17" = 'Failed to parse "1999-03-17"'
      `,
  });
});
