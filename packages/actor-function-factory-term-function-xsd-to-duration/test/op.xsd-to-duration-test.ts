import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { durationTyped } from '@comunica/utils-expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/utils-expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionXsdToDuration } from '../lib';

describe('to duration', () => {
  runFuncTestTable({
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionXsdToDuration(args),
    ],
    arity: 1,
    notation: Notation.Function,
    operation: 'xsd:duration',
    testTable: `
        ${durationTyped('-PT10H')} = ${durationTyped('-PT10H')}
      `,
  });
});
