import { ActorFunctionFactoryTermFunctionDatatype } from '@comunica/actor-function-factory-term-function-datatype';
import { ActorFunctionFactoryTermFunctionIri } from '@comunica/actor-function-factory-term-function-iri';
import { ActorFunctionFactoryTermFunctionIsBlank } from '@comunica/actor-function-factory-term-function-is-blank';
import { ActorFunctionFactoryTermFunctionIsIri } from '@comunica/actor-function-factory-term-function-is-iri';
import { ActorFunctionFactoryTermFunctionIsLiteral } from '@comunica/actor-function-factory-term-function-is-literal';
import { ActorFunctionFactoryTermFunctionIsNumeric } from '@comunica/actor-function-factory-term-function-is-numeric';
import { ActorFunctionFactoryTermFunctionLang } from '@comunica/actor-function-factory-term-function-lang';
import { runFuncTestTable } from '@comunica/bus-function-factory/test/util';
import { bool } from '@comunica/expression-evaluator/test/util/Aliases';
import { Notation } from '@comunica/expression-evaluator/test/util/TestTable';
import { ActorFunctionFactoryTermFunctionStr } from '../lib';

describe('evaluation of functions on RDF terms', () => {
  describe('like \'str\' receiving', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionStr(args),
      ],
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

    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionStr(args),
      ],
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
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionLang(args),
      ],
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

    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionLang(args),
      ],
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
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionDatatype(args),
      ],
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
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionIsIri(args),
      ],
      arity: 1,
      aliases: bool,
      notation: Notation.Function,
      operation: 'isIRI',
      testTable: `
        <http://example.com> = true
        BNODE() = false
        "foo" = false
      `,
    });
  });

  describe('like \'isURI\' receiving', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionIsIri(args),
      ],
      arity: 1,
      aliases: bool,
      notation: Notation.Function,
      operation: 'isURI',
      testTable: `
        <http://example.com> = true
        BNODE() = false
        "foo" = false
      `,
    });
  });

  describe('like \'isBlank\' receiving', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionIsBlank(args),
      ],
      arity: 1,
      aliases: bool,
      notation: Notation.Function,
      operation: 'isBlank',
      testTable: `
        <http://example.com> = false
        BNODE() = true
        "foo" = false
      `,
    });
  });

  describe('like \'isLiteral\' receiving', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionIsLiteral(args),
      ],
      arity: 1,
      aliases: bool,
      notation: Notation.Function,
      operation: 'isLiteral',
      testTable: `
        <http://example.com> = false
        BNODE() = false
        "foo" = true
        "foo"@fr = true
      `,
    });
  });

  describe('like \'isNumeric\' receiving', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionIsNumeric(args),
      ],
      arity: 1,
      aliases: bool,
      notation: Notation.Function,
      operation: 'isNumeric',
      testTable: `
        <http://example.com> = false
        BNODE() = false
        "foo" = false
        "foo"@fr = false
        1 = true
        "1"^^xsd:int = true
      `,
    });
  });

  describe('like \'iri\' receiving', () => {
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionIri(args),
      ],
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
    runFuncTestTable({
      registeredActors: [
        args => new ActorFunctionFactoryTermFunctionIri(args),
      ],
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
