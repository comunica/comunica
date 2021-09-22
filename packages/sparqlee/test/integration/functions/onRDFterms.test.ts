import { Notation } from '../../util/TestTable';
import { runTestTable } from '../../util/utils';

describe('evaluation of functions on RDF terms', () => {
  describe('like \'str\' receiving', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'str',
      testTable: `
        "" = ""
        "simple" = "simple"
        "lang"@en = "lang"
        "3"^^xsd:integer = "3"',
        "badlex"^^xsd:integer = "badlex"
        <http://dbpedia.org/resource/Adventist_Heritage> = "http://dbpedia.org/resource/Adventist_Heritage"
        '"1000"^^xsd:integer + "1e3"^^xsd:double' = "2.0E3"
      `,
    });
  });

  describe('like \'lang\' receiving', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'lang',
      testTable: `
        "a"@fr = "fr"
        "a" = ""
      `,
    });
  });

  describe('like \'datatype\' receiving', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'datatype',
      testTable: `
      "3"^^xsd:integer = http://www.w3.org/2001/XMLSchema#integer
      "a"^^xsd:string = http://www.w3.org/2001/XMLSchema#string
      '"plain literal"'  = http://www.w3.org/2001/XMLSchema#string
      "3"^^xsd:anyURI = http://www.w3.org/2001/XMLSchema#anyURI
      `,
    });
  });
});
