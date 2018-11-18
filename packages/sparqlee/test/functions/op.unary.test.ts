import { aliases as a, testAll } from '../util/utils';

describe('evaluation of \'! (unary)\' like', () => {
  testAll([
    `! ${a.true}  = ${a.false}`,
    `! ${a.false} = ${a.true} `,
  ]);

  describe('should cast to EVB so', () => {
    testAll([
      `! ""               = ${a.true} `,
      `! "3"^^xsd:integer = ${a.false}`,
    ]);
  });
});

describe('evaluation of \'+ (unary)\' like', () => {
  testAll([
    '+ "3"^^xsd:integer     = "3"^^xsd:integer    ',
    '+ "-10.5"^^xsd:decimal = "-10.5"^^xsd:decimal',
    '+ "NaN"^^xsd:float     = "NaN"^^xsd:float    ',
  ]);
});

describe('evaluation of \'- (unary)\' like', () => {
  testAll([
    '- "3"^^xsd:integer     = "-3"^^xsd:integer  ',
    '- "0"^^xsd:integer     = "0"^^xsd:integer   ',
    '- "-10.5"^^xsd:decimal = "10.5"^^xsd:decimal',
    '- "NaN"^^xsd:float     = "NaN"^^xsd:float   ',
    // '- "0"^^xsd:float       = "-0."^^xsd:float   ', // TODO: Document
    '- "-0"^^xsd:float      = "0"^^xsd:float     ',
    '- "-INF"^^xsd:float    = "INF"^^xsd:float   ',
    '- "INF"^^xsd:float     = "-INF"^^xsd:float  ',

  ]);
});
