import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import {
  date,
  decimal,
  DF,
  double,
  float,
  getMockEEFactory,
  int,
  makeAggregate,
  nonLiteral,
  string,
} from './helpers';

const AF = new AlgebraFactory();

describe('The Expression evaluator util function', () => {
  describe('makeAggregate', () => {
    it('creates basic count aggregator', () => {
      expect(makeAggregate('count')).toMatchObject(AF.createAggregateExpression(
        'count',
        AF.createTermExpression(DF.variable('x')),
        false,
        undefined,
      ));
    });

    it('creates distinct count aggregator', () => {
      expect(makeAggregate('count', true)).toMatchObject(
        AF.createAggregateExpression('count', AF.createTermExpression(DF.variable('x')), true, undefined),
      );
    });

    it('creates wildcard count aggregator', () => {
      expect(makeAggregate('count', false, undefined, true)).toMatchObject(
        AF.createAggregateExpression('count', AF.createWildcardExpression(), false, undefined),
      );
    });

    it('creates group concat with different separator aggregator', () => {
      expect(makeAggregate('group_concat', false, ', ')).toMatchObject(
        AF.createAggregateExpression('group_concat', AF.createTermExpression(DF.variable('x')), false, ', '),
      );
    });
  });

  describe('int', () => {
    it('returns the int as literal', () => {
      const value = int('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#integer');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('float', () => {
    it('returns the float as literal', () => {
      const value = float('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#float');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('decimal', () => {
    it('returns the decimal as literal', () => {
      const value = decimal('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#decimal');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('date', () => {
    it('returns the date as literal', () => {
      const value = date('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#date');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('string', () => {
    it('returns the string as literal', () => {
      const value = string('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#string');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('double', () => {
    it('returns the double as literal', () => {
      const value = double('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#double');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('nonLiteral', () => {
    it('returns something that is not a literal', () => {
      const value = nonLiteral();
      expect(value.termType === 'Literal').toBeFalsy();
    });
  });

  describe('getMockEEFactory', () => {
    it('Throws an error on mediator calls when not provided', async() => {
      await expect(() => (<any> getMockEEFactory()).mediatorQueryOperation.mediate(<IActionQueryOperation> {}))
        .rejects.toThrow('mediatorQueryOperation mock not implemented');
    });
  });
});
