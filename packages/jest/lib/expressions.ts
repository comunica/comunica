import {
  ActorExpressionEvaluatorFactoryDefault,
} from '@comunica/actor-expression-evaluator-factory-default/lib';
import { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-default/lib/InternalEvaluator';
import { BindingsFactory } from '@comunica/bindings-factory';
import type {
  ActorExpressionEvaluatorFactory, IActorExpressionEvaluatorFactoryArgs,
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
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

export function getMockEEActionContext(actionContext?: IActionContext): IActionContext {
  return new ActionContext({
    [KeysInitQuery.queryTimestamp.name]: new Date(Date.now()),
    [KeysInitQuery.functionArgumentsCache.name]: {},
    [KeysExpressionEvaluator.superTypeProvider.name]: getMockSuperTypeProvider(),
  }).merge(actionContext ?? new ActionContext());
}

export function getMockInternalEvaluator(factory?: ActorExpressionEvaluatorFactory,
  context?: IActionContext): InternalEvaluator {
  const defFactory = factory ?? getMockEEFactory();
  return new InternalEvaluator(
    prepareEvaluatorActionContext(getMockEEActionContext(context)),
    getMockMediatorFunctionFactory(),
    <any>{
      async mediate(arg: any) {
        throw new Error('mediatorQueryOperation mock of mockEEFactory not implemented');
      },
    },
  );
}

export function getMockEEFactory({
  mediatorQueryOperation,
  mediatorFunctionFactory,
}: Partial<IActorExpressionEvaluatorFactoryArgs> = {}): ActorExpressionEvaluatorFactory {
  return new ActorExpressionEvaluatorFactoryDefault({
    bus: new Bus({ name: 'testBusMock' }),
    name: 'mockEEFactory',
    mediatorQueryOperation: mediatorQueryOperation || getMockMediatorQueryOperation(),
    mediatorFunctionFactory: mediatorFunctionFactory || getMockMediatorFunctionFactory(),
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

export function getMockMediatorFunctionFactory(): MediatorFunctionFactory {
  return <any>{
    async mediate(arg: any) {
      throw new Error('mediatorFunctionFactory mock not implemented');
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
