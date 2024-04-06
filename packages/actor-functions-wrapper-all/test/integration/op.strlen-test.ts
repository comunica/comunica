import { compactTermString, int, str } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import type { ITestTableConfigBase } from '@comunica/expression-evaluator/test/util/utils';
import { runFuncTestTable } from '../util';

describe('evaluation of \'strlen\' like', () => {
  const baseConfig: ITestTableConfigBase = {
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
