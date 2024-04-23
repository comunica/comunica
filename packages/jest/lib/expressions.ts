import {
  ActorExpressionEvaluatorFactoryBase,
} from '@comunica/actor-expression-evaluator-factory-base';
import { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-base/lib/InternalEvaluator';
import { BindingsFactory } from '@comunica/bindings-factory';
import type {
  ActorExpressionEvaluatorFactory, IActorExpressionEvaluatorFactoryArgs,
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import type { MediatorFunctions } from '@comunica/bus-functions';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { prepareEvaluatorActionContext } from '@comunica/expression-evaluator/lib/util/Context';
import type { GeneralSuperTypeDict, IActionContext, ISuperTypeProvider } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
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
    aggregator: <any>aggregator,
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

export function getMockEEActionContext(): IActionContext {
  return new ActionContext({}).set(KeysExpressionEvaluator.superTypeProvider, getMockSuperTypeProvider());
}

export function getMockInternalEvaluator(factory?: ActorExpressionEvaluatorFactory,
  context?: IActionContext): InternalEvaluator {
  const defFactory = factory ?? getMockEEFactory();
  return new InternalEvaluator(
    prepareEvaluatorActionContext(context ?? getMockEEActionContext()),
    getMockMediatorFunctions(),
    <any>{
      async mediate(arg: any) {
        throw new Error('mediatorQueryOperation mock of mockEEFactory not implemented');
      },
    },
  );
}

export function getMockEEFactory({
  mediatorQueryOperation,
  mediatorFunctions,
}: Partial<IActorExpressionEvaluatorFactoryArgs> = {}): ActorExpressionEvaluatorFactory {
  return new ActorExpressionEvaluatorFactoryBase({
    bus: new Bus({ name: 'testBusMock' }),
    name: 'mockEEFactory',
    mediatorQueryOperation: mediatorQueryOperation || getMockMediatorQueryOperation(),
    mediatorFunctions: mediatorFunctions || getMockMediatorFunctions(),
  });
}

export function getMockMediatorQueryOperation(): MediatorQueryOperation {
  return <any>{
    async mediate(arg: any) {
      throw new Error('mediatorQueryOperation mock not implemented');
    },
  };
}

export function getMockMediatorExpressionEvaluatorFactory(
  args: Partial<IActorExpressionEvaluatorFactoryArgs> = {},
): MediatorExpressionEvaluatorFactory {
  return <any>{
    async mediate(arg: any) {
      return getMockEEFactory(args).run(arg);
    },
  };
}

export function getMockMediatorFunctions(): MediatorFunctions {
  return <any>{
    async mediate(arg: any) {
      throw new Error('mediatorFunctions mock not implemented');
    },
  };
}

export function getMockMediatorTermComparatorFactory(): MediatorTermComparatorFactory {
  return <any>{
    async mediate(arg: any) {
      throw new Error('mediatorTermComparatorFactory mock not implemented');
    },
  };
}

export function getMockSuperTypeProvider(): ISuperTypeProvider {
  return {
    cache: new LRUCache<string, GeneralSuperTypeDict>({ max: 1_000 }),
    discoverer: _ => 'term',
  };
}
