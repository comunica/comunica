import { TypeURL } from '../../../lib/util/Consts';
import { decimal, numeric } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
import { runTestTable } from '../../util/utils';

describe('evaluation of \'/\' like', () => {
  const config: ITestTableConfigBase = {
    arity: 2,
    operation: '/',
    aliases: numeric,
    notation: Notation.Infix,
  };
  runTestTable({
    ...config,
    testTable: `
      0i   1i  = 0d
      2i   1i  = 2d
      12i  6i  = 2d
      6i   INF = 0f
      6i  -INF = 0f
    
      -0f  -0f =  NaN
       1f  -1f = -1f
       12f  6f =  2f
      -3f   0f = -INF
       3f   0f =  INF
    
      INF -INF = NaN
      INF  0f  = INF
      0f  -INF = 0f
    
      NaN    NaN    = NaN
      NaN    anyNum = NaN
      anyNum NaN    = NaN
    `,
    errorTable: `
      0i 0i = 'Integer division by 0'
      3i 0i = 'Integer division by 0'
    `,
  });
  runTestTable({
    ...config,
    config: {
      type: 'sync',
      config: {
        getSuperType: unknownType => TypeURL.XSD_INTEGER,
      },
    },
    testTable: `
      "2"^^example:int "2"^^example:int = ${decimal('1')}
    `,
    errorTable: `
      "2"^^example:int "0"^^example:int = 'Integer division by 0'
    `,
  });
});
