import {
  runFuncTestTable,
  durationTyped,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryTermXsdToDuration } from '../lib';

describe('to duration', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermXsdToDuration(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:duration',
    testTable: `
        ${durationTyped('-PT10H')} = ${durationTyped('-PT10H')}
      `,
  });
});
