import { bool, error, merge, numeric, str } from '../../util/Aliases';
import { Notation } from '../../util/TestTable';
import type { ITestTableConfigBase } from '../../util/utils';
import { runTestTable } from '../../util/utils';
// https://www.w3.org/TR/sparql11-query/#ebv
// Using && as utility to force EBV
describe('the coercion of RDF terms to it\'s EBV like', () => {
  describe('using \'&&\' like', () => {
    runTestTable({
      arity: 2,
      notation: Notation.Infix,
      operation: '&&',
      aliases: bool,
      testTable: `
      '"non lexical"^^xsd:boolean' true = false
      '"non lexical"^^xsd:integer' true = false
      
      true true = true
      false false = false
      
      ""              true = false
      ""@en           true = false
      ""^^xsd:string  true = false
      
      "a"             true = true
      "a"@en          true = true
      "a"^^xsd:string true = true
      
      "0"^^xsd:integer      true = false
      "0.0"^^xsd:double     true = false
      "0"^^xsd:unsignedInt  true = false
      "NaN"^^xsd:float      true = false
      
      "3"^^xsd:integer      true = true
      "0.01667"^^xsd:double true = true
      "1"^^xsd:unsignedInt  true = true
      "INF"^^xsd:float      true = true
      "-INF"^^xsd:float     true = true
    `,
      errorTable: `
        ?a true = ''
        "2001-10-26T21:32:52+02:00"^^xsd:dateTime true = ''
        <http://example.com> true = ''
     `,
    });
  });

  describe('using \'!\' like', () => {
    const baseConfig: ITestTableConfigBase = {
      arity: 1,
      operation: '!',
      aliases: merge(numeric, bool, error, str),
      notation: Notation.Prefix,
    };
    // We use these tests to test the evaluation of EBV: https://www.w3.org/TR/sparql11-query/#ebv
    runTestTable({
      ...baseConfig,
      testTable: `
      true = false
      false = true
      
      0i = true
      NaN = true
      1i = false
      '-5i' = false
      
      empty = true
      '""' = true
      aaa = false
      'aaa' = false
      
      invalidBool = true
      invalidInt = true
      invalidShort = true
    `,
      errorTable: `
      invalidDateTime = 'Cannot coerce term to EBV'
    `,
    });
  });
});
