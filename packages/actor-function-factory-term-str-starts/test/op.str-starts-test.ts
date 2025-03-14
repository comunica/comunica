import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermStrStarts } from '../lib';

describe('evaluation of \'strstarts\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermStrStarts(args),
    ],
    arity: 2,
    operation: 'strstarts',
    notation: Notation.Function,
    aliases: bool,
    testTable: `
       "ab" "a" = true
       "ab" "c" = false
       "ab"@en "a"@en = true
       "ab"@en "c"@en = false
      `,
    errorTable: `
       "ab"@en "a"@fr = 'Operation on incompatible language literals'
      `,
  });
});
