import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { ExpressionEvaluatorFactory } from '@comunica/expression-evaluator';
import type { IMediatorFunctions, IMediatorTermComparator } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Quad } from 'rdf-data-factory';
import { DataFactory } from 'rdf-data-factory';
import { Algebra } from 'sparqlalgebrajs';
import { Wildcard } from 'sparqljs';

export const DF = new DataFactory<Quad>();

export const BF = new BindingsFactory();

export function makeAggregate(aggregator: string, distinct = false, separator?: string, wildcard = false):
Algebra.AggregateExpression {
  const inner: Algebra.Expression = wildcard ?
    {
      type: Algebra.types.EXPRESSION,
      expressionType: Algebra.expressionTypes.WILDCARD,
      wildcard: new Wildcard(),
    } :
    {
      type: Algebra.types.EXPRESSION,
      expressionType: Algebra.expressionTypes.TERM,
      term: DF.variable('x'),
    };
  return {
    type: Algebra.types.EXPRESSION,
    expressionType: Algebra.expressionTypes.AGGREGATE,
    aggregator: <any> aggregator,
    distinct,
    separator,
    expression: inner,
  };
}

export function int(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
}

export function float(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#float'));
}

export function decimal(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal'));
}

export function date(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#date'));
}

export function string(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#string'));
}

export function double(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#double'));
}

export function nonLiteral(): RDF.Term {
  return DF.namedNode('http://example.org/');
}

export function getMockEEFactory({ mediatorQueryOperation,
  mediatorBindingsAggregatorFactory,
  mediatorFunctions,
  mediatorTermComparator }: {
  mediatorQueryOperation?: MediatorQueryOperation;
  mediatorBindingsAggregatorFactory?: MediatorBindingsAggregatorFactory;
  mediatorFunctions?: IMediatorFunctions;
  mediatorTermComparator?: IMediatorTermComparator;
} = {}): ExpressionEvaluatorFactory {
  return new ExpressionEvaluatorFactory({
    mediatorQueryOperation: mediatorQueryOperation || <any> {
      async mediate(arg: any) {
        throw new Error('mediatorQueryOperation mock of mockEEFactory not implemented');
      },
    },
    mediatorBindingsAggregatorFactory: mediatorBindingsAggregatorFactory || <any> {
      async mediate(arg: any) {
        throw new Error('mediatorBindingsAggregatorFactory mock of mockEEFactory not implemented');
      },
    },
    mediatorFunctions,
    mediatorTermComparator,
  });
}
