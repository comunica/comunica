import {
  ActorFunctionFactoryExpressionNotIn,
} from '@comunica/actor-function-factory-expression-not-in';
import { ActorFunctionFactoryTermEquality } from '@comunica/actor-function-factory-term-equality';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool, merge, numeric } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryExpressionIn } from '../lib';

describe('evaluations of \'IN\'', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionIn(args),
      args => new ActorFunctionFactoryTermEquality(args),
    ],
    operation: 'IN',
    arity: 2,
    notation: Notation.Infix,
    aliases: merge(numeric, bool),
    testTable: `
      1 (2,1,3) = true
      1 (2,1.0,3) = true
      1 (2,3) = false
      1 (?a,1) = true
    `,
    errorTable: `
      1 (?a) = 'Some argument to IN errorred and none where equal.'
    `,
  });

  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryExpressionIn(args),
      args => new ActorFunctionFactoryTermEquality(args),
      args => new ActorFunctionFactoryExpressionNotIn(args),
    ],
    operation: 'NOT IN',
    arity: 2,
    notation: Notation.Infix,
    aliases: merge(numeric, bool),
    testTable: `
      1 (2,1,3) = false
      1 (2,1.0,3) = false
      1 (2,3) = true
      1 (?a,1) = false
    `,
    errorTable: `
      1 (?a) = 'Some argument to IN errorred and none where equal.'
    `,
  });
});
