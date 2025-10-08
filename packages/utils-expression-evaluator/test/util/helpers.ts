import {
  ActorExpressionEvaluatorFactoryDefault,
} from '@comunica/actor-expression-evaluator-factory-default';
import { InternalEvaluator } from '@comunica/actor-expression-evaluator-factory-default/lib/InternalEvaluator';
import type {
  ActorExpressionEvaluatorFactory,
  IActorExpressionEvaluatorFactoryArgs,
  MediatorExpressionEvaluatorFactory,
} from '@comunica/bus-expression-evaluator-factory';
import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { GeneralSuperTypeDict, IActionContext, ISuperTypeProvider } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import * as Eval from '../../lib/index';

export const DF = new DataFactory();
export const BF = new BindingsFactory(DF);
const AF = new AlgebraFactory(DF);

export function makeAggregate(aggregator: string, distinct = false, separator?: string, wildcard = false):
Algebra.AggregateExpression {
  const inner: Algebra.Expression = wildcard ?
    AF.createWildcardExpression() :
    AF.createTermExpression(DF.variable('x'));
  return AF.createAggregateExpression(aggregator, inner, distinct, separator);
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
    [KeysInitQuery.dataFactory.name]: DF,
  }).merge(actionContext ?? new ActionContext());
}

export function getMockInternalEvaluator(factory?: ActorExpressionEvaluatorFactory, context?: IActionContext):
InternalEvaluator {
  return new InternalEvaluator(
    Eval.prepareEvaluatorActionContext(getMockEEActionContext(context)),
    getMockMediatorFunctionFactory(),
    <any> {},
    <any> {},
  );
}

export function getMockEEFactory({
  mediatorQueryOperation,
  mediatorFunctionFactory,
  mediatorMergeBindingsContext,
}: Partial<IActorExpressionEvaluatorFactoryArgs> = {}): ActorExpressionEvaluatorFactory {
  return new ActorExpressionEvaluatorFactoryDefault({
    bus: new Bus({ name: 'testBusMock' }),
    name: 'mockEEFactory',
    mediatorQueryOperation: mediatorQueryOperation ?? getMockMediatorQueryOperation(),
    mediatorFunctionFactory: mediatorFunctionFactory ?? getMockMediatorFunctionFactory(),
    mediatorMergeBindingsContext: mediatorMergeBindingsContext ?? getMockMediatorMergeBindingsContext(),
  });
}

export function getMockMediatorQueryOperation(): MediatorQueryOperation {
  return <any>{
    async mediate(_: any) {
      throw new Error('mediatorQueryOperation mock not implemented');
    },
  };
}

export function getMockMediatorMergeBindingsContext(): MediatorMergeBindingsContext {
  return <any>{
    async mediate(_: any) {
      return BF;
    },
  };
}

export function getMockMediatorExpressionEvaluatorFactory(
  args: Partial<IActorExpressionEvaluatorFactoryArgs> = {},
): MediatorExpressionEvaluatorFactory {
  return <any>{
    async mediate(arg: any) {
      return getMockEEFactory(args).run(arg, undefined);
    },
  };
}

export function getMockMediatorFunctionFactory(): MediatorFunctionFactory {
  return <any>{
    async mediate(_: any) {
      throw new Error('mediatorFunctionFactory mock not implemented');
    },
  };
}

export function getMockSuperTypeProvider(): ISuperTypeProvider {
  return {
    cache: new LRUCache<string, GeneralSuperTypeDict>({ max: 1_000 }),
    discoverer: _ => 'term',
  };
}
