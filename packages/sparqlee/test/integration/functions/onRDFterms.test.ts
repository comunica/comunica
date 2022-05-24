import { bool } from '../../util/Aliases';
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

    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'STR',
      testTable: `
        "simple" = "simple"
        "lang"@en = "lang"
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
      errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
    });

    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'LANG',
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
      errorTable: `
        <http://example.com> = 'Argument types not valid for operator'
      `,
    });
  });

  describe('like \'isIRI\' receiving', () => {
    runTestTable({
      arity: 1,
      aliases: bool,
      notation: Notation.Function,
      operation: 'isIRI',
      testTable: `
        <http://example.com> = true
        "foo" = false
      `,
    });
  });

  describe('like \'isURI\' receiving', () => {
    runTestTable({
      arity: 1,
      aliases: bool,
      notation: Notation.Function,
      operation: 'isURI',
      testTable: `
        <http://example.com> = true
        "foo" = false
      `,
    });
  });

  describe('like \'isBlank\' receiving', () => {
    runTestTable({
      arity: 1,
      aliases: bool,
      notation: Notation.Function,
      operation: 'isBlank',
      testTable: `
        <http://example.com> = false
        "foo" = false
      `,
    });
  });

  describe('like \'isLiteral\' receiving', () => {
    runTestTable({
      arity: 1,
      aliases: bool,
      notation: Notation.Function,
      operation: 'isLiteral',
      testTable: `
        <http://example.com> = false
        "foo" = true
        "foo"@fr = true
      `,
    });
  });

  describe('like \'iri\' receiving', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'iri',
      testTable: `
      <http://example.com> = http://example.com
      "http://example.com" = http://example.com
      `,
      errorTable: `
        "foo" = 'Found invalid relative IRI'
        1 = 'Argument types not valid for operator'
      `,
    });
  });

  describe('like \'uri\' receiving', () => {
    runTestTable({
      arity: 1,
      notation: Notation.Function,
      operation: 'uri',
      testTable: `
      <http://example.com> = http://example.com
      "http://example.com" = http://example.com
      `,
      errorTable: `
        "foo" = 'Found invalid relative IRI'
        1 = 'Argument types not valid for operator'
      `,
    });
  });
});
