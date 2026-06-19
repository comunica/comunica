import type * as RDF from '@rdfjs/types';
import * as rdfString from 'rdf-string';
import {
  bool,
  compactTermString,
  dateTimeTyped,
  dateTyped,
  dayTimeDurationTyped,
  decimal,
  defaultPrefixes,
  double,
  durationTyped,
  int,
  merge,
  numeric,
  stringToTermPrefix,
  template,
  timeTyped,
  yearMonthDurationTyped,
} from '../../lib/expressionEvaluator/Aliases';

describe('Aliases', () => {
  describe('merge', () => {
    it('merges multiple alias maps', () => {
      const result = merge(bool, numeric);
      expect(result.true).toBe('"true"^^xsd:boolean');
      expect(result['0i']).toBe('"0"^^xsd:integer');
    });

    it('merges with later maps overriding earlier ones', () => {
      const map1 = { a: 'value1' };
      const map2 = { a: 'value2', b: 'value3' };
      const result = merge(map1, map2);
      expect(result.a).toBe('value2');
      expect(result.b).toBe('value3');
    });
  });

  describe('compactTermString', () => {
    it('returns a compact term string with the given value and datatype', () => {
      expect(compactTermString('5', 'xsd:integer')).toBe('"5"^^xsd:integer');
    });
  });

  describe('int', () => {
    it('wraps a value as xsd:integer', () => {
      expect(int('42')).toBe('"42"^^xsd:integer');
    });
  });

  describe('decimal', () => {
    it('wraps a value as xsd:decimal', () => {
      expect(decimal('3.14')).toBe('"3.14"^^xsd:decimal');
    });
  });

  describe('double', () => {
    it('wraps a value as xsd:double', () => {
      expect(double('1.5')).toBe('"1.5"^^xsd:double');
    });
  });

  describe('dateTimeTyped', () => {
    it('wraps a value as xsd:dateTime', () => {
      expect(dateTimeTyped('2001-10-26T21:32:52')).toBe('"2001-10-26T21:32:52"^^xsd:dateTime');
    });
  });

  describe('timeTyped', () => {
    it('wraps a value as xsd:time', () => {
      expect(timeTyped('10:00:00')).toBe('"10:00:00"^^xsd:time');
    });
  });

  describe('dateTyped', () => {
    it('wraps a value as xsd:date', () => {
      expect(dateTyped('2010-06-21')).toBe('"2010-06-21"^^xsd:date');
    });
  });

  describe('durationTyped', () => {
    it('wraps a value as xsd:duration', () => {
      expect(durationTyped('P1Y')).toBe('"P1Y"^^xsd:duration');
    });
  });

  describe('dayTimeDurationTyped', () => {
    it('wraps a value as xsd:dayTimeDuration', () => {
      expect(dayTimeDurationTyped('PT10H')).toBe('"PT10H"^^xsd:dayTimeDuration');
    });
  });

  describe('yearMonthDurationTyped', () => {
    it('wraps a value as xsd:yearMonthDuration', () => {
      expect(yearMonthDurationTyped('P1Y')).toBe('"P1Y"^^xsd:yearMonthDuration');
    });
  });

  describe('stringToTermPrefix', () => {
    it('returns a named node when given a URI', () => {
      const term = stringToTermPrefix('http://example.org/');
      expect(term.termType).toBe('NamedNode');
      expect(term.value).toBe('http://example.org/');
    });

    it('resolves a known prefix in the datatype', () => {
      const term = <RDF.Literal> stringToTermPrefix('"5"^^xsd:integer');
      expect(term.termType).toBe('Literal');
      expect(term.value).toBe('5');
      expect(term.datatype.value).toBe('http://www.w3.org/2001/XMLSchema#integer');
    });

    it('does not resolve an unknown prefix in the datatype', () => {
      const term = <RDF.Literal> stringToTermPrefix('"5"^^unknown:type');
      expect(term.termType).toBe('Literal');
      expect(term.datatype.value).toBe('unknown:type');
    });

    it('resolves with additional prefixes provided', () => {
      const additionalPrefixes = { custom: 'http://custom.example.org/' };
      const term = <RDF.Literal> stringToTermPrefix('"value"^^custom:myType', additionalPrefixes);
      expect(term.termType).toBe('Literal');
      expect(term.datatype.value).toBe('http://custom.example.org/myType');
    });

    it('handles literals with a plain string type', () => {
      const term = <RDF.Literal> stringToTermPrefix('"hello"');
      expect(term.termType).toBe('Literal');
      expect(term.value).toBe('hello');
    });

    it('returns term early when the literal has no datatype', () => {
      const fakeLiteral = <RDF.Term> <unknown> { termType: 'Literal', value: 'hello', datatype: undefined };
      const spy = jest.spyOn(rdfString, 'stringToTerm').mockReturnValueOnce(fakeLiteral);
      const result = stringToTermPrefix('"hello"');
      expect(result).toBe(fakeLiteral);
      spy.mockRestore();
    });

    it('handles a datatype URL with no colon (covers matched-null branch)', () => {
      // A datatype like "nocolon" has no `:`, so matched is null and prefix falls back to ''
      const term = <RDF.Literal> stringToTermPrefix('"hello"^^nocolon');
      expect(term.termType).toBe('Literal');
      expect(term.value).toBe('hello');
    });

    it('catches exception when assigning to a frozen datatype value', () => {
      const frozenDatatype = Object.freeze({ termType: 'NamedNode', value: 'xsd:integer', equals: () => false });
      const fakeLiteral = <RDF.Term> <unknown> {
        termType: 'Literal',
        value: '5',
        datatype: frozenDatatype,
        language: '',
        direction: '',
      };
      const spy = jest.spyOn(rdfString, 'stringToTerm').mockReturnValueOnce(fakeLiteral);
      // The try block tries to assign to frozenDatatype.value, which throws in strict mode;
      // the catch block handles it and returns the term unchanged.
      const result = stringToTermPrefix('"5"^^xsd:integer');
      expect(result).toBe(fakeLiteral);
      spy.mockRestore();
    });
  });

  describe('template', () => {
    it('generates a SPARQL SELECT query with default prefixes and the given expression', () => {
      const result = template('1 + 2');
      expect(result).toContain('SELECT *');
      expect(result).toContain('FILTER (1 + 2)');
      expect(result).toContain(`PREFIX xsd: <${defaultPrefixes.xsd}>`);
    });

    it('includes additional prefixes when provided', () => {
      const result = template('1', { custom: 'http://custom.example.org/' });
      expect(result).toContain('PREFIX custom: <http://custom.example.org/>');
    });

    it('handles prefix strings that already end with a colon', () => {
      const result = template('1', { 'myns:': 'http://myns.example.org/' });
      expect(result).toContain('PREFIX myns: <http://myns.example.org/>');
    });
  });
});
