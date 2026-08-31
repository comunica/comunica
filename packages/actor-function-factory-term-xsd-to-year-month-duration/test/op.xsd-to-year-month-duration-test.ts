import {
  runFuncTestTable,
  dayTimeDurationTyped,
  durationTyped,
  yearMonthDurationTyped,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermXsdToYearMonthDuration } from '../lib';

describe('to yearMonthDuration', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermXsdToYearMonthDuration(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:yearMonthDuration',
    testTable: `
        ${durationTyped('-PT10H')} = ${yearMonthDurationTyped('P0M')}
        ${durationTyped('-P5Y6M')} = ${yearMonthDurationTyped('-P5Y6M')}
        '"P5Y30M"' = ${yearMonthDurationTyped('P7Y6M')}
        ${dayTimeDurationTyped('P1DT1H1M1.1S')} = ${yearMonthDurationTyped('P0M')}
      `,
    errorTable: `
        '"-PT10H"' = 'Failed to parse "-PT10H"'
      `,
  });
});
