import {
  runFuncTestTable,
  dayTimeDurationTyped,
  durationTyped,
  yearMonthDurationTyped,
  Notation,
} from '@comunica/utils-jest';
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
