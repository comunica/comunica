import { compactTermString, int, str } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
import { runTestTable } from '../../util/utils';

describe('evaluation of \'strlen\' like', () => {
  const baseConfig: ITestTableConfigBase = {
    arity: 1,
    operation: 'strlen',
    aliases: str,
    notation: Notation.Function,
  };
  runTestTable({
    ...baseConfig,
    testTable: `
      aaa = '${int('3')}'
      empty = '${int('0')}'
      '${compactTermString('Annabel', 'xsd:name')}' = '${int('7')}'
    `,
  });
});
