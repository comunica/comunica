import { testAll } from '../util/utils';

describe('evaluation of functions on RDF terms', () => {
  describe('like \'str\' receiving', () => {
    testAll([
      'str("") = ""',
      'str("simple") = "simple"',
      'str("lang"@en) = "lang"',
      'str("3"^^xsd:integer) = "3"',
      'str("badlex"^^xsd:integer) = "badlex"',
      'str(<http://dbpedia.org/resource/Adventist_Heritage>) = "http://dbpedia.org/resource/Adventist_Heritage"',
      'str("1000"^^xsd:integer + "1e3"^^xsd:double) = "2.0E3"',
    ]);
  });

  describe('like \'lang\' receiving', () => {
    testAll([
      'lang("a"@fr) = "fr" ',
      'lang("a")    = ""   ',
    ]);
  });

  describe('like \'datatype\' receiving', () => {
    testAll([
      'datatype("3"^^xsd:integer) = http://www.w3.org/2001/XMLSchema#integer',
      'datatype("a"^^xsd:string)  = http://www.w3.org/2001/XMLSchema#string ',
      'datatype("plain literal")  = http://www.w3.org/2001/XMLSchema#string ',
    ]);
  });
});
