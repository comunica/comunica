import {
  runFuncTestTable,
  Notation,
} from '@comunica/utils-jest';
import { ActorFunctionFactoryExpressionBnode } from '../lib';

describe('evaluations of \'bnode\' with custom blank node generator function', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionBnode(args),
    ],
    operation: 'BNODE',
    arity: 1,
    notation: Notation.Function,
    errorTable: `
    1 = 'Argument types not valid for operator'
    `,
  });
});
