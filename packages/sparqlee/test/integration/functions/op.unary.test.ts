import { bool } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
import { runTestTable } from '../../util/utils';

describe('unary functions', () => {
  describe('evaluation of \'! (unary)\' like', () => {
    const config: ITestTableConfigBase = {
      arity: 1,
      operation: '!',
      notation: Notation.Prefix,
      aliases: bool,
    };
    runTestTable({
      ...config,
      testTable: `
        true = false
        false = true
      `,
    });
    describe('should cast to EVB so', () => {
      runTestTable({
        ...config,
        testTable: `
          "" = true
          "3"^^xsd:integer = false                  
        `,
      });
    });
  });

  describe('evaluation of \'+ (unary)\' like', () => {
    runTestTable({
      arity: 1,
      operation: '+',
      notation: Notation.Prefix,
      testTable: `
        "3"^^xsd:integer     = "3"^^xsd:integer
        "-10.5"^^xsd:decimal = "-10.5"^^xsd:decimal
        "NaN"^^xsd:float     = "NaN"^^xsd:float
      `,
    });
  });

  describe('evaluation of \'- (unary)\' like', () => {
    // '- "0"^^xsd:float       = "-0."^^xsd:float   ' // TODO: Document
    runTestTable({
      arity: 1,
      operation: '-',
      notation: Notation.Prefix,
      testTable: `
        "3"^^xsd:integer     = "-3"^^xsd:integer
        "0"^^xsd:integer     = "0"^^xsd:integer
        "-10.5"^^xsd:decimal = "10.5"^^xsd:decimal
        "NaN"^^xsd:float     = "NaN"^^xsd:float
        "-0"^^xsd:float      = "0"^^xsd:float
        "-INF"^^xsd:float    = "INF"^^xsd:float
        "INF"^^xsd:float     = "-INF"^^xsd:float
      `,
    });
  });
});
