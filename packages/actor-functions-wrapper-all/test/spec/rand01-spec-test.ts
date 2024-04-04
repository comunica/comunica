import { bool } from '../util/Aliases';
import { Notation } from '../util/TestTable';
import type { ITestTableConfigBase } from '../util/utils';
import { runTestTable } from '../util/utils';

describe('We should respect the rand01 spec', () => {
  const config: ITestTableConfigBase = {
    arity: 2,
    notation: Notation.Infix,
    aliases: bool,
    operation: '',
  };
  runTestTable({
    ...config,
    operation: '>=',
    testTable: `
      RAND() 0.0 = true
    `,
  });
  runTestTable({
    ...config,
    operation: '<',
    testTable: `
      RAND() 1.0 = true    
    `,
  });
  runTestTable({
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
