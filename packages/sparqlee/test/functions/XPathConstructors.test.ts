import { testAll } from '../util/utils';

describe('evaluation of XPath constructors', () => {
  describe('like \'str\' receiving', () => {
    testAll([
      'xsd:string("")                    = ""      ',
      'xsd:string("simple")              = "simple"',
      'xsd:string("lang"@en)             = "lang"  ',
      'xsd:string("3"^^xsd:integer)      = "3"     ',
      'xsd:string("badlex"^^xsd:integer) = "badlex"',
      'xsd:string(<http://dbpedia.org/resource/Adventist_Heritage>) = "http://dbpedia.org/resource/Adventist_Heritage"',
    ]);
  });

  describe('like \'flt\' receiving', () => {
    testAll([
      'xsd:float("3")          = "3"^^xsd:float',
      'xsd:float("3"^^xsd:int) = "3"^^xsd:float',
    ]);
  });

  describe('like \'dbl\' receiving', () => {
    testAll([
      'xsd:double("3")          = "3.0E0"^^xsd:double',
      'xsd:double("3"^^xsd:int) = "3.0E0"^^xsd:double',
    ]);
  });

  describe('like \'dec\' receiving', () => {
    testAll([
      'xsd:decimal("3")          = "3"^^xsd:decimal',
      'xsd:decimal("3"^^xsd:int) = "3"^^xsd:decimal',
    ]);
  });

  describe('like \'int\' receiving', () => {
    testAll([
      'xsd:integer("3")          = "3"^^xsd:integer',
      'xsd:integer("3"^^xsd:int) = "3"^^xsd:integer',
    ]);
  });

  describe('like \'dT\' receiving', () => {
    testAll([
      'xsd:dateTime("1999-03-17T06:00:00Z") = "1999-03-17T06:00:00Z"^^xsd:dateTime',
    ]);
  });

  describe('like \'bool\' receiving', () => {
    testAll([
    ]);
  });
});
