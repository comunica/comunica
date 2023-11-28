import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import type { IAction } from '@comunica/core';
import type { IMediatorFunctions,
  IActionContext,
  IBindingsAggregator,
  IExpressionEvaluator,
  IExpressionEvaluatorFactory,
  IOrderByEvaluator, ITermComparatorBusActionContext,
  IMediatorTermComparator,
  IExpressionFunction, IFunctionBusActionContext, ITermFunction } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { namedFunctions, regularFunctions, specialFunctions } from '../functions';
import { NamedExtension } from '../functions/NamedExtension';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer';
import { RegularOperator } from '../util/Consts';
import type * as C from '../util/Consts';
import { extractTimeZone } from '../util/DateTimeHelpers';
import { ExpressionEvaluator } from './ExpressionEvaluator';
import type { AsyncExtensionFunction, AsyncExtensionFunctionCreator } from './InternalEvaluator';
import { InternalEvaluator } from './InternalEvaluator';
import { TermComparator } from './TermComparator';

// TODO: This should be a single actor on a bus, and the utils should be classes with that bus.
export class ExpressionEvaluatorFactory implements IExpressionEvaluatorFactory {
  public readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorFunctions: IMediatorFunctions;
  public readonly termComparatorBus: IMediatorTermComparator;

  public prepareEvaluatorActionContext(orgContext: IActionContext): IActionContext {
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

    context = context.set(KeysExpressionEvaluator.mediatorQueryOperation, this.mediatorQueryOperation);
    context = context.set(KeysExpressionEvaluator.mediatorFunction, this.mediatorFunctions);

    context = context.setDefault(KeysExpressionEvaluator.superTypeProvider, {
      cache: new LRUCache({ max: 1_000 }),
      discoverer: () => 'term',
    });

    return context;
  }

  public constructor(args: IExpressionEvaluatorFactoryArgs) {
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
        new TermComparator(new InternalEvaluator(this.prepareEvaluatorActionContext(context)),
          await this.createFunction({ functionName: RegularOperator.EQUAL, context, requireTermExpression: true }),
          await this.createFunction({ functionName: RegularOperator.LT, context, requireTermExpression: true })),
    };
  }

  public async createEvaluator(algExpr: Alg.Expression, context: IActionContext): Promise<IExpressionEvaluator> {
    const fullContext = this.prepareEvaluatorActionContext(context);
    return new ExpressionEvaluator(
      fullContext,
      await new AlgebraTransformer(
        fullContext,
      ).transformAlgebra(algExpr),
    );
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

interface IExpressionEvaluatorFactoryArgs {
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  mediatorQueryOperation: MediatorQueryOperation;
  mediatorFunctions?: IMediatorFunctions;
  mediatorTermComparator?: IMediatorTermComparator;
}
