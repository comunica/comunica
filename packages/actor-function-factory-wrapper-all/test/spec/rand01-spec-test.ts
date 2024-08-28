import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import type { ITestTableConfigBase } from '@comunica/expression-evaluator/test/util/utils';
import { runFuncTestTable } from '../../../bus-function-factory/test/util';

describe('We should respect the rand01 spec', () => {
  const config: ITestTableConfigBase = {
    arity: 2,
    notation: Notation.Infix,
    aliases: bool,
    operation: '',
  };
  runFuncTestTable({
    ...config,
    operation: '>=',
    testTable: `
      RAND() 0.0 = true
    `,
  });
  runFuncTestTable({
    ...config,
    operation: '<',
    testTable: `
      RAND() 1.0 = true    
    `,
  });
  runFuncTestTable({
    arity: 1,
    operation: 'DATATYPE',
    notation: Notation.Function,
    testTable: `
      RAND() = http://www.w3.org/2001/XMLSchema#double    
    `,
  });
});

/**
 * RESULTS: rand01.srx
 *
 * <?xml version="1.0" encoding="utf-8"?>
 * <sparql xmlns="http://www.w3.org/2005/sparql-results#">
 * <head></head>
 * <boolean>true</boolean>
 * </sparql>
 */
