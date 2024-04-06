// We need to disable typescript because we want undefined types.
import { getMockSuperTypeProvider } from '@comunica/jest';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

import * as E from '../../../lib/expressions';
import { isNonLexicalLiteral } from '../../../lib/expressions';
import { TermTransformer } from '../../../lib/transformers/TermTransformer';
import { TypeURL as DT } from '../../../lib/util/Consts';
import * as Err from '../../../lib/util/Errors';

function int(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_INTEGER));
}

function float(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_FLOAT));
}

function decimal(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_DECIMAL));
}

function double(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_DOUBLE));
}

function boolean(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_BOOLEAN));
}

function dateTime(value: string): RDF.Literal {
  return DF.literal(value, DF.namedNode(DT.XSD_DATE_TIME));
}

const DF = new DataFactory();

describe('TermTransformer', () => {
  let termTransformer: TermTransformer;
  beforeEach(() => {
    termTransformer = new TermTransformer(getMockSuperTypeProvider());
  });

  function simpleLiteralCreator(value: string, dataType?: string, language?: string): RDF.Literal {
    return {
      termType: 'Literal',
      value,
      // @ts-expect-error
      language,
      // @ts-expect-error
      datatype: dataType === undefined ? undefined : DF.namedNode(dataType),
      equals: _ => false,
    };
  }

  function returnNonLexicalTest(value: string, dataType: string) {
    const lit = DF.literal(value, DF.namedNode(dataType));
    const res = isNonLexicalLiteral(termTransformer.transformLiteral(lit));
    expect(res).toBeTruthy();
    // @ts-expect-error
    expect(res.dataType).toEqual(dataType);
    // @ts-expect-error
    expect(res.strValue).toEqual(value);
    // @ts-expect-error
    expect(res.typedValue.toString()).toEqual('undefined');
  }

  describe('terms', () => {
    it('variable', () => {
      expect(termTransformer.transformRDFTermUnsafe(DF.variable('foo'))).toEqual(new E.Variable('?foo'));
    });

    it('named node', () => {
      expect(termTransformer.transformRDFTermUnsafe(DF.namedNode('foo'))).toEqual(new E.NamedNode('foo'));
    });

    it('blank node', () => {
      expect(termTransformer.transformRDFTermUnsafe(DF.blankNode('foo'))).toEqual(new E.BlankNode('foo'));
    });

    it('literal', () => {
      expect(termTransformer.transformRDFTermUnsafe(DF.literal('foo'))).toEqual(new E.StringLiteral('foo'));
    });

    it('default graph', () => {
      expect(termTransformer.transformRDFTermUnsafe(DF.defaultGraph())).toEqual(new E.DefaultGraph());
    });

    it('Quad', () => {
      const quad = DF.quad(
        DF.namedNode('foo'),
        DF.namedNode('foo'),
        DF.namedNode('foo'),
        DF.defaultGraph(),
      );
      expect(termTransformer.transformRDFTermUnsafe(quad))
        .toEqual(new E.Quad(
          new E.NamedNode('foo'),
          new E.NamedNode('foo'),
          new E.NamedNode('foo'),
          new E.DefaultGraph(),
        ));
      expect(termTransformer.transformRDFTermUnsafe(quad).str())
        .toEqual('Quad: [foo, foo, foo, DefaultGraph]');
    });

    it('null', () => {
      expect(() => {
        // @ts-expect-error
        termTransformer.transformRDFTermUnsafe(null);
      }).toThrow(Err.InvalidExpression);
    });
  });

  describe('ordering literals', () => {
    it('invalid namedNode', () => {
      // No namednode, language is also not given
      const num = int('11');
      // @ts-expect-error
      num.termType = undefined;
      const res = termTransformer.transformLiteral(num);
      expect(res.strValue).toEqual('11');
      expect(res.typedValue).toEqual(11);
      expect(res.language).toEqual(undefined);
      expect(res.dataType).toEqual(DT.XSD_INTEGER);
      // No namednode but language is given
      num.language = 'en';
      const res2 = termTransformer.transformLiteral(num);
      expect(res2.strValue).toEqual('11');
      expect(res2.typedValue).toEqual(11);
      expect(res2.language).toEqual(undefined);
      expect(res2.dataType).toEqual(DT.XSD_INTEGER);
    });

    it('boolean type transform', () => {
      const b = boolean('true');
      const res = termTransformer.transformLiteral(b);
      expect(res.strValue).toEqual('true');
      expect(res.termType).toEqual('literal');
      expect(res.dataType).toEqual(DT.XSD_BOOLEAN);
      expect(res.typedValue).toEqual(true);
      expect(res.expressionType).toEqual('term');

      expect(termTransformer.transformLiteral(boolean('1')).typedValue).toEqual(true);
      expect(termTransformer.transformLiteral(boolean('false')).typedValue).toEqual(false);
      expect(termTransformer.transformLiteral(boolean('0')).typedValue).toEqual(false);
    });

    it('integers type transform', () => {
      const num = int('11');
      const res = termTransformer.transformLiteral(num);
      expect(res.strValue).toEqual('11');
      expect(res.termType).toEqual('literal');
      expect(res.dataType).toEqual(DT.XSD_INTEGER);
      expect(res.typedValue).toEqual(11);
      expect(res.expressionType).toEqual('term');
    });

    it('double type transform', () => {
      const num = double('11');
      const res = termTransformer.transformLiteral(num);
      expect(res.strValue).toEqual('11');
      expect(res.termType).toEqual('literal');
      expect(res.dataType).toEqual(DT.XSD_DOUBLE);
      expect(res.typedValue).toEqual(11);
      expect(res.expressionType).toEqual('term');
    });
    it('decimal type transform', () => {
      const num = decimal('11');
      const res = termTransformer.transformLiteral(num);
      expect(res.strValue).toEqual('11');
      expect(res.termType).toEqual('literal');
      expect(res.dataType).toEqual(DT.XSD_DECIMAL);
      expect(res.typedValue).toEqual(11);
      expect(res.expressionType).toEqual('term');
    });

    it('float type transform', () => {
      const num = float('11');
      const res = termTransformer.transformLiteral(num);
      expect(res.strValue).toEqual('11');
      expect(res.termType).toEqual('literal');
      expect(res.dataType).toEqual(DT.XSD_FLOAT);
      expect(res.typedValue).toEqual(11);
      expect(res.expressionType).toEqual('term');
    });

    it('dateTime type transform', () => {
      const num = dateTime('2022-01-02T03:04:05Z');
      const res = termTransformer.transformLiteral(num);
      expect(res.strValue).toEqual('2022-01-02T03:04:05Z');
      expect(res.termType).toEqual('literal');
      expect(res.dataType).toEqual(DT.XSD_DATE_TIME);
      expect(res.typedValue).toEqual({
        year: 2_022,
        month: 1,
        day: 2,
        hours: 3,
        minutes: 4,
        seconds: 5,
        zoneHours: 0,
        zoneMinutes: 0,
      });
      expect(res.expressionType).toEqual('term');
    });

    it('string type transform', () => {
      const lit = DF.literal('ab');
      const res = termTransformer.transformLiteral(lit);
      expect(res.strValue).toEqual('ab');
      expect(res.termType).toEqual('literal');
      expect(res.dataType).toEqual(DT.XSD_STRING);
      expect(res.typedValue).toEqual('ab');
      expect(res.expressionType).toEqual('term');
    });

    it('langString type transform', () => {
      const lit = DF.literal('ab', 'en');
      const res = termTransformer.transformLiteral(lit);
      expect(res.strValue).toEqual('ab');
      expect(res.termType).toEqual('literal');
      expect(res.dataType).toEqual(DT.RDF_LANG_STRING);
      expect(res.typedValue).toEqual('ab');
      expect(res.language).toEqual('en');
      expect(res.expressionType).toEqual('term');
    });

    it('transforms other literals', () => {
      const lit = DF.literal('foo', DF.namedNode('http://example.com'));
      const res = termTransformer.transformLiteral(lit);
      expect(res.strValue).toEqual('foo');
      expect(res.termType).toEqual('literal');
      expect(res.dataType).toEqual('http://example.com');
      expect(res.typedValue).toEqual('foo');
      expect(res.expressionType).toEqual('term');
    });
  });

  describe('exports transformLiteral function', () => {
    describe('handles simple literals', () => {
      it('transforms simple literal to STRING', () => {
        const someStr = 'apple';
        const lit = simpleLiteralCreator(someStr);
        expect(lit.datatype).toBeFalsy();
        const res = termTransformer.transformLiteral(lit);
        expect(res.dataType).toEqual(DT.XSD_STRING);
        expect(res.strValue).toEqual(someStr);
        expect(res.typedValue).toEqual(someStr);
      });

      it('transforms simple literal with language to LANGSTRING', () => {
        const someStr = 'apple';
        const lit = simpleLiteralCreator(someStr, undefined, 'eng');
        expect(lit.datatype).toBeFalsy();
        expect(lit.language).toBeTruthy();
        const res = termTransformer.transformLiteral(lit);
        expect(res.dataType).toEqual(DT.RDF_LANG_STRING);
        expect(res.strValue).toEqual(someStr);
        expect(res.typedValue).toEqual(someStr);
      });

      it('transforms simple literal with empty datatype value', () => {
        const someStr = 'apple';
        // @ts-expect-error
        const lit = simpleLiteralCreator(someStr, null);
        expect(lit.datatype).toBeTruthy();
        expect(lit.language).toBeFalsy();
        expect(lit.datatype.value).toBeFalsy();
        const res = termTransformer.transformLiteral(lit);
        expect(res.dataType).toEqual(DT.XSD_STRING);
        expect(res.strValue).toEqual(someStr);
        expect(res.typedValue).toEqual(someStr);
      });
    });

    describe('returns non-lexical when value and datatype do not match', () => {
      it('datatype: float', () => {
        returnNonLexicalTest('apple', DT.XSD_FLOAT);
      });

      it('datatype: decimal', () => {
        returnNonLexicalTest('apple', DT.XSD_DECIMAL);
      });

      it('datatype: boolean', () => {
        returnNonLexicalTest('apple', DT.XSD_BOOLEAN);
      });

      it('datatype: dateTime', () => {
        returnNonLexicalTest('apple', DT.XSD_DATE_TIME);
      });

      it('datatype: date', () => {
        returnNonLexicalTest('apple', DT.XSD_DATE);
      });

      it('datatype: time', () => {
        returnNonLexicalTest('apple', DT.XSD_TIME);
      });

      it('datatype: duration', () => {
        returnNonLexicalTest('apple', DT.XSD_DURATION);
      });

      it('datatype: dayTimeDuration', () => {
        returnNonLexicalTest('apple', DT.XSD_DAY_TIME_DURATION);
      });

      it('datatype: YearMonthDuration', () => {
        returnNonLexicalTest('apple', DT.XSD_YEAR_MONTH_DURATION);
      });
    });

    it('badly invalid literal', () => {
      // @ts-expect-error
      const res = termTransformer.transformLiteral({
        termType: 'Literal',
        datatype: DF.namedNode(DT.XSD_FLOAT),
      });
      expect(res.strValue).toBeUndefined();
      expect(res.str()).toEqual('');
      expect(res.typedValue.toString()).toEqual('undefined');
    });
  });
});
