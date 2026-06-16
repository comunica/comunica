import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool, Notation } from '@comunica/utils-jest';
import { ActorFunctionFactoryTermStrEnds } from '../lib';

describe('evaluation of \'strends\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStrEnds(args),
    ],
    arity: 2,
    operation: 'strends',
    notation: Notation.Function,
    aliases: bool,
    testTable: `
       "ab" "b" = true
       "ab" "c" = false
       "ab"@en "b"@en = true
       "ab"@en "c"@en = false
      `,
    errorTable: `
       "ab"@en "b"@fr = 'Operation on incompatible language literals'
      `,
  });
});
