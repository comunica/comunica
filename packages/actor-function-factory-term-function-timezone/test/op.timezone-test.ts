import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { dateTyped, timeTyped } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionTimezone } from '../lib';

describe('evaluation of \'timezone\'', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionTimezone(args),
    ],
    operation: 'timezone',
    arity: 1,
    notation: Notation.Function,
    testTable: `
      "2000-01-01T00:00:00Z"^^xsd:dateTime = "PT0S"^^xsd:dayTimeDuration
      "2000-01-01T00:00:00+00:00"^^xsd:dateTime = "PT0S"^^xsd:dayTimeDuration
      "2000-01-01T00:00:00-00:00"^^xsd:dateTime = "PT0S"^^xsd:dayTimeDuration
      "2000-01-01T00:00:00+00:30"^^xsd:dateTime = "PT30M"^^xsd:dayTimeDuration
      "2000-01-01T00:00:00+01:00"^^xsd:dateTime = "PT1H"^^xsd:dayTimeDuration
      "2000-01-01T00:00:00+01:30"^^xsd:dateTime = "PT1H30M"^^xsd:dayTimeDuration
      "2000-01-01T00:00:00-01:30"^^xsd:dateTime = "-PT1H30M"^^xsd:dayTimeDuration
      
      '${dateTyped('2000-01-01Z')}' = "PT0S"^^xsd:dayTimeDuration
      '${dateTyped('2000-01-01+00:00')}' = "PT0S"^^xsd:dayTimeDuration
      '${dateTyped('2000-01-01-00:00')}' = "PT0S"^^xsd:dayTimeDuration
      '${dateTyped('2000-01-01+00:30')}' = "PT30M"^^xsd:dayTimeDuration
      '${dateTyped('2000-01-01+01:00')}' = "PT1H"^^xsd:dayTimeDuration
      '${dateTyped('2000-01-01+01:30')}' = "PT1H30M"^^xsd:dayTimeDuration
      '${dateTyped('2000-01-01-01:30')}' = "-PT1H30M"^^xsd:dayTimeDuration
      
      '${timeTyped('00:00:00Z')}' = "PT0S"^^xsd:dayTimeDuration
      '${timeTyped('00:00:00+00:00')}' = "PT0S"^^xsd:dayTimeDuration
      '${timeTyped('00:00:00-00:00')}' = "PT0S"^^xsd:dayTimeDuration
      '${timeTyped('00:00:00+00:30')}' = "PT30M"^^xsd:dayTimeDuration
      '${timeTyped('00:00:00+01:00')}' = "PT1H"^^xsd:dayTimeDuration
      '${timeTyped('00:00:00+01:30')}' = "PT1H30M"^^xsd:dayTimeDuration
      '${timeTyped('00:00:00-01:30')}' = "-PT1H30M"^^xsd:dayTimeDuration
      `,
  });
});
