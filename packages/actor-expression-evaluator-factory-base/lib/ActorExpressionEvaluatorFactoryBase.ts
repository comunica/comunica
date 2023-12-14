import { AlgebraTransformer } from '@comunica/actor-expression-evaluator-factory-base/lib/AlgebraTransformer';
import type {
  IBindingsAggregator,
  MediatorBindingsAggregatorFactory,
} from '@comunica/bus-bindings-aggeregator-factory';
import type {
  IActionExpressionEvaluatorFactory,
  IActorExpressionEvaluatorFactoryArgs,
  IActorExpressionEvaluatorFactoryOutput,
} from '@comunica/bus-expression-evaluator-factory';
import { ActorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type {
  IExpressionFunction,
  MediatorFunctions,
  IActionFunctions,
  IActorFunctionsOutput,
  IActorFunctionsOutputTerm,
} from '@comunica/bus-functions';
import { namedFunctions, regularFunctions, specialFunctions } from '@comunica/bus-functions/lib/implementation';
import { NamedExtension } from '@comunica/bus-functions/lib/implementation/NamedExtension';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { MediatorTermComparatorFactory, ITermComparator } from '@comunica/bus-term-comparator-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { IAction, IActorTest } from '@comunica/core';
import type * as C from '@comunica/expression-evaluator/lib/util/Consts';
import { extractTimeZone } from '@comunica/expression-evaluator/lib/util/DateTimeHelpers';
import type {
  AsyncExtensionFunction,
  AsyncExtensionFunctionCreator,
  IActionContext,

} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { ExpressionEvaluator } from './ExpressionEvaluator';

export function prepareEvaluatorActionContext(orgContext: IActionContext): IActionContext {
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

  context = context.setDefault(KeysExpressionEvaluator.superTypeProvider, {
    cache: new LRUCache({ max: 1_000 }),
    discoverer: () => 'term',
  });

  return context;
}

export const MockFunctionMediator = <MediatorFunctions> {
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

/**
 * A comunica Base Expression Evaluator Factory Actor.
 */
export class ActorExpressionEvaluatorFactoryBase extends ActorExpressionEvaluatorFactory {
  public readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorTermComparatorFactory: MediatorTermComparatorFactory;
  // TODO: should become readonly after bussification.
  public mediatorFunctions: MediatorFunctions;

  public constructor(args: IActorExpressionEvaluatorFactoryArgs) {
    super(args);
    this.mediatorQueryOperation = args.mediatorQueryOperation;
    this.mediatorBindingsAggregatorFactory = args.mediatorBindingsAggregatorFactory;
    this.mediatorTermComparatorFactory = args.mediatorTermComparatorFactory;
    this.mediatorFunctions = args.mediatorFunctions || MockFunctionMediator;
  }

  public async test(action: IActionExpressionEvaluatorFactory): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionExpressionEvaluatorFactory): Promise<IActorExpressionEvaluatorFactoryOutput> {
    const fullContext = prepareEvaluatorActionContext(action.context);
    return {
      expressionEvaluator: new ExpressionEvaluator(
        fullContext,
        await new AlgebraTransformer(
          fullContext,
          this.mediatorFunctions,
        ).transformAlgebra(action.algExpr),
        this.mediatorFunctions,
        this.mediatorQueryOperation,
      ),
    };
  }

  public async createAggregator(algExpr: Alg.AggregateExpression, context: IActionContext):
  Promise<IBindingsAggregator> {
    return (await this.mediatorBindingsAggregatorFactory.mediate({
      expr: algExpr,
      context,
    })).aggregator;
  }

  public createTermComparator(context: IAction): Promise<ITermComparator> {
    return this.mediatorTermComparatorFactory.mediate(context);
  }

  public createFunction<T extends IActionFunctions>(action: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionsOutputTerm : IActorFunctionsOutput> {
    return this.mediatorFunctions.mediate(action);
  }
}
