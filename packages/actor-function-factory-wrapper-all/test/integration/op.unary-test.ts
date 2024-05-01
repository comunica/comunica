import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import type { ITestTableConfigBase } from '@comunica/expression-evaluator/test/util/utils';
import { runFuncTestTable } from '../util';

describe('unary functions', () => {
  describe('evaluation of \'! (unary)\' like', () => {
    const config: ITestTableConfigBase = {
      arity: 1,
      operation: '!',
      notation: Notation.Prefix,
      aliases: bool,
    };
    runFuncTestTable({
      ...config,
      testTable: `
        true = false
        false = true
      `,
    });
    describe('should cast to EVB so', () => {
      runFuncTestTable({
        ...config,
        testTable: `
          "" = true
          "3"^^xsd:integer = false                  
        `,
      });
    });
  });

  describe('evaluation of \'+ (unary)\' like', () => {
    runFuncTestTable({
      arity: 1,
      operation: '+',
      notation: Notation.Prefix,
      testTable: `
        "3"^^xsd:integer     = "3"^^xsd:integer
        "3"^^xsd:decimal     = "3"^^xsd:decimal
        "3"^^xsd:float       = "3"^^xsd:float
        "3"^^xsd:double      = "3.0E0"^^xsd:double
        "-10.5"^^xsd:decimal = "-10.5"^^xsd:decimal
        "NaN"^^xsd:float     = "NaN"^^xsd:float
      `,
    });
  });

  describe('evaluation of \'- (unary)\' like', () => {
    // '- "0"^^xsd:float       = "-0."^^xsd:float   ' // TODO: Document
    runFuncTestTable({
      arity: 1,
      operation: '-',
      notation: Notation.Prefix,
      testTable: `
        "3"^^xsd:integer     = "-3"^^xsd:integer
        "3"^^xsd:decimal     = "-3"^^xsd:decimal
        "3"^^xsd:float       = "-3"^^xsd:float
        "3"^^xsd:double      = "-3.0E0"^^xsd:double
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
