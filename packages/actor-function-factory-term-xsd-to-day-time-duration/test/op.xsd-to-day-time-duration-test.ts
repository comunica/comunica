import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import {
  dayTimeDurationTyped,
  durationTyped,
  yearMonthDurationTyped,
} from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermXsdToDayTimeDuration } from '../lib';

describe('to dayTimeDuration', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermXsdToDayTimeDuration(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:dayTimeDuration',
    testTable: `
        ${durationTyped('-PT10H')} = ${dayTimeDurationTyped('-PT10H')}
        ${durationTyped('PT5S')} = ${dayTimeDurationTyped('PT5S')}
        '"-PT10H"' = '${dayTimeDurationTyped('-PT10H')}'
        '${yearMonthDurationTyped('-P5Y2M')}' = '${dayTimeDurationTyped('PT0S')}'
      `,
    errorTable: `
        '"P5Y30M"' = 'Failed to parse "P5Y30M"'
      `,
  });
});
