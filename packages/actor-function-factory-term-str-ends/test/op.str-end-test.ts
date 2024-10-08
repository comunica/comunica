import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionStrEnds } from '../lib';

describe('evaluation of \'strends\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionStrEnds(args),
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
