import type { FuncTestTableConfig } from '@comunica/bus-function-factory/test/util';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { compactTermString, int, str } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionStrLen } from '../lib';

describe('evaluation of \'strlen\' like', () => {
  const baseConfig: FuncTestTableConfig<object> = {
    registeredActors: [
      args => new ActorFunctionFactoryTermFunctionStrLen(args),
    ],
    arity: 1,
    operation: 'strlen',
    aliases: str,
    notation: Notation.Function,
  };
  runFuncTestTable({
    ...baseConfig,
    testTable: `
      aaa = '${int('3')}'
      empty = '${int('0')}'
      '${compactTermString('Annabel', 'xsd:name')}' = '${int('7')}'
    `,
  });
});
