import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { dateTyped, timeTyped } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermTz } from '../lib';

describe('evaluation of \'TZ\'', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermTz(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'TZ',
    testTable: `
    '${dateTyped('2010-06-21Z')}' = "Z"
    '${dateTyped('2010-12-21-08:00')}' = "-08:00"
    '${dateTyped('2008-06-20Z')}' = "Z"
    '${dateTyped('2011-02-01')}' = ""
    
    '${timeTyped('11:28:01Z')}' = "Z"
    '${timeTyped('15:38:02-08:00')}' = "-08:00"
    '${timeTyped('23:59:00Z')}' = "Z"
    '${timeTyped('01:02:03')}' = ""
  `,
  });
});
