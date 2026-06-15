import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import {
  int,
  timeTyped,
  Notation,
} from '@comunica/utils-jest';

import { ActorFunctionFactoryTermMinutes } from '../lib';

describe('evaluation of \'MINUTES\'', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermMinutes(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'MINUTES',
    testTable: `
    '${timeTyped('11:28:01Z')}' = '${int('28')}'
    '${timeTyped('15:38:02-08:00')}' = '${int('38')}'
    '${timeTyped('23:59:00Z')}' = '${int('59')}'
    '${timeTyped('01:02:03')}' = '${int('2')}'
  `,
  });
});
