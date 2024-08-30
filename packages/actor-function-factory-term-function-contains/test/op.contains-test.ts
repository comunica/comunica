import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionContains } from '../lib';

describe('evaluation of \'contains\' like', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionContains(args),
    ],
    arity: 2,
    operation: 'contains',
    notation: Notation.Function,
    aliases: bool,
    testTable: `
       "aa" "a" = true
       "aa" "b" = false
       "aa"@en "a"@en = true
       "aa"@en "b"@en = false
       '"some string"' '"e s"' = true
      `,
    errorTable: `
       "aa"@en "a"@fr = 'Operation on incompatible language literals'
      `,
  });
});
