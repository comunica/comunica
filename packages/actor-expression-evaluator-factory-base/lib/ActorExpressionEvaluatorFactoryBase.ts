import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type {
  IActionExpressionEvaluatorFactory,
  IActorExpressionEvaluatorFactoryOutput,
  IActorExpressionEvaluatorFactoryArgs,
} from '@comunica/bus-expression-evaluator-factory';
import { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, IAction } from '@comunica/core';
import { ExpressionEvaluator } from '@comunica/expression-evaluator';
import type { AsyncExtensionFunctionCreator,
  AsyncExtensionFunction } from '@comunica/expression-evaluator/lib/evaluators/InternalEvaluator';
import {
  InternalEvaluator,
} from '@comunica/expression-evaluator/lib/evaluators/InternalEvaluator';
import { TermComparator } from '@comunica/expression-evaluator/lib/evaluators/TermComparator';
import { namedFunctions, regularFunctions, specialFunctions } from '@comunica/expression-evaluator/lib/functions';
import { NamedExtension } from '@comunica/expression-evaluator/lib/functions/NamedExtension';
import { AlgebraTransformer } from '@comunica/expression-evaluator/lib/transformers/AlgebraTransformer';
import type * as C from '@comunica/expression-evaluator/lib/util/Consts';
import { RegularOperator } from '@comunica/expression-evaluator/lib/util/Consts';
import { extractTimeZone } from '@comunica/expression-evaluator/lib/util/DateTimeHelpers';
import type { IMediatorFunctions, IMediatorTermComparator, IExpressionFunction, IActionContext, IBindingsAggregator,
  IFunctionBusActionContext,
  IOrderByEvaluator,
  ITermComparatorBusActionContext,
  ITermFunction } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra as Alg } from 'sparqlalgebrajs';

export function prepareEvaluatorActionContext(orgContext: IActionContext,
  mediatorQueryOperation: MediatorQueryOperation,
  mediatorFunctions: IMediatorFunctions): IActionContext {
  let context = orgContext;

  context =
    context.set(KeysExpressionEvaluator.now, context.get(KeysInitQuery.queryTimestamp) || new Date(Date.now()));

  context = context.set(KeysExpressionEvaluator.baseIRI, context.get(KeysInitQuery.baseIRI));
  context = context.set(
    KeysExpressionEvaluator.functionArgumentsCache,
    context.get(KeysInitQuery.functionArgumentsCache) || {},
  );

  // Handle two variants of providing extension functions
  if (context.has(KeysInitQuery.extensionFunctionCreator) && context.has(KeysInitQuery.extensionFunctions)) {
    throw new Error('Illegal simultaneous usage of extensionFunctionCreator and extensionFunctions in context');
  }
  if (context.has(KeysInitQuery.extensionFunctionCreator)) {
    context = context.set(
      KeysExpressionEvaluator.extensionFunctionCreator,
      context.get(KeysInitQuery.extensionFunctionCreator),
    );
  } else if (context.has(KeysInitQuery.extensionFunctions)) {
    const extensionFunctions: Record<string, AsyncExtensionFunction> = context.getSafe(
      KeysInitQuery.extensionFunctions,
    );
    context = context.set(KeysExpressionEvaluator.extensionFunctionCreator,
      async(functionNamedNode: RDF.NamedNode) => extensionFunctions[functionNamedNode.value]);
  } else {
    // eslint-disable-next-line unicorn/no-useless-undefined
    context = context.setDefault(KeysExpressionEvaluator.extensionFunctionCreator, async() => undefined);
  }

  context = context.setDefault(
    KeysExpressionEvaluator.defaultTimeZone,
    extractTimeZone(context.getSafe(KeysExpressionEvaluator.now)),
  );

  context = context.set(KeysExpressionEvaluator.mediatorQueryOperation, mediatorQueryOperation);
  context = context.set(KeysExpressionEvaluator.mediatorFunction, mediatorFunctions);

  context = context.setDefault(KeysExpressionEvaluator.superTypeProvider, {
    cache: new LRUCache({ max: 1_000 }),
    discoverer: () => 'term',
  });

  return context;
}

/**
 * A comunica Base Expression Evaluator Factory Actor.
 */
export class ActorExpressionEvaluatorFactoryBase extends ActorExpressionEvaluatorFactory {
  public readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  // TODO: should become readonly after bussification.
  public mediatorFunctions: IMediatorFunctions;
  public termComparatorBus: IMediatorTermComparator;

  public constructor(args: IActorExpressionEvaluatorFactoryArgs) {
    super(args);
    this.mediatorBindingsAggregatorFactory = args.mediatorBindingsAggregatorFactory;
    this.mediatorQueryOperation = args.mediatorQueryOperation;
    this.mediatorFunctions = args.mediatorFunctions || <IMediatorFunctions> {
      async mediate({ functionName, context }) {
        const res: IExpressionFunction | undefined = {
          ...regularFunctions,
          ...specialFunctions,
          ...namedFunctions,
        }[<C.NamedOperator | C.Operator> functionName];
        if (res) {
          return res;
        }

        const extensionFinder: AsyncExtensionFunctionCreator =
          context.getSafe(KeysExpressionEvaluator.extensionFunctionCreator);
        const definition = await extensionFinder(new DataFactory<RDF.Quad>().namedNode(functionName));
        if (definition) {
          return new NamedExtension(functionName, definition);
        }
      },
    };
    this.termComparatorBus = args.mediatorTermComparator || <IMediatorTermComparator> {
      mediate: async({ context }) =>
        new TermComparator(new InternalEvaluator(prepareEvaluatorActionContext(context,
          this.mediatorQueryOperation,
          this.mediatorFunctions)),
        await this.createFunction({ functionName: RegularOperator.EQUAL, context, requireTermExpression: true }),
        await this.createFunction({ functionName: RegularOperator.LT, context, requireTermExpression: true })),
    };
  }

  public async test(action: IActionExpressionEvaluatorFactory): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionExpressionEvaluatorFactory): Promise<IActorExpressionEvaluatorFactoryOutput> {
    const fullContext = prepareEvaluatorActionContext(action.context,
      this.mediatorQueryOperation,
      this.mediatorFunctions);
    return {
      expressionEvaluator: new ExpressionEvaluator(
        fullContext,
        await new AlgebraTransformer(
          fullContext,
        ).transformAlgebra(action.algExpr),
      ),
    };
  }

  public async createAggregator(algExpr: Alg.AggregateExpression, context: IActionContext):
  Promise<IBindingsAggregator> {
    return (await this.mediatorBindingsAggregatorFactory.mediate({
      expr: algExpr,
      factory: this,
      context,
    })).aggregator;
  }

  public createFunction<T extends IFunctionBusActionContext>(arg: T & IAction):
  Promise<T extends { requireTermExpression: true } ? ITermFunction : IExpressionFunction> {
    return this.mediatorFunctions.mediate(arg);
  }

  public async createTermComparator(orderAction: ITermComparatorBusActionContext):
  Promise<IOrderByEvaluator> {
    return this.termComparatorBus.mediate(orderAction);
  }
}
