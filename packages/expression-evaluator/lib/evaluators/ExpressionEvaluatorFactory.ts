import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type {
  FunctionBusType,
  IActionContext,
  IBindingsAggregator,
  IExpressionEvaluator,
  IExpressionEvaluatorFactory,
  IExpressionFunction,
  IOrderByEvaluator, ITermComparatorBusActionContext,
  TermComparatorBus,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { namedFunctions, regularFunctions, specialFunctions } from '../functions';
import { NamedExtension } from '../functions/NamedExtension';
import { AlgebraTransformer } from '../transformers/AlgebraTransformer';
import type * as C from '../util/Consts';
import { RegularOperator } from '../util/Consts';
import { extractTimeZone } from '../util/DateTimeHelpers';
import { ExpressionEvaluator } from './ExpressionEvaluator';
import type { AsyncExtensionFunction } from './InternalEvaluator';
import { InternalEvaluator } from './InternalEvaluator';
import { TermComparator } from './TermComparator';

// TODO: This should be a single actor on a bus, and the utils should be classes with that bus.
export class ExpressionEvaluatorFactory implements IExpressionEvaluatorFactory {
  public readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly functionsBus = <FunctionBusType> (async({ functionName, context }) => {
    const res: IExpressionFunction | undefined = {
      ...regularFunctions,
      ...specialFunctions,
      ...namedFunctions,
    }[<C.NamedOperator | C.Operator> functionName];
    if (res) {
      return res;
    }
    const extensionFinder: ((functionNamedNode: RDF.NamedNode) =>
    Promise<((args: RDF.Term[]) => Promise<RDF.Term>) | undefined>) | undefined =
      context.get(KeysInitQuery.extensionFunctionCreator);
    if (extensionFinder) {
      const definition = await extensionFinder(new DataFactory<RDF.Quad>().namedNode(functionName));
      if (definition) {
        return new NamedExtension(functionName, definition);
      }
    }
    const extensionMap: Record<string, (args: RDF.Term[]) => Promise<RDF.Term>> | undefined =
      context.get(KeysInitQuery.extensionFunctions);
    if (extensionMap) {
      // Uncovered by tests, but that does not matter.
      const definition = extensionMap[functionName];
      if (definition) {
        return new NamedExtension(functionName, definition);
      }
    }
    throw new Error('No Function Actor Replied');
  });

  private prepareEvaluatorActionContext(orgContext: IActionContext): IActionContext {
    const context = new ActionContext(orgContext);

    context.set(KeysExpressionEvaluator.now, context.get(KeysInitQuery.queryTimestamp) || new Date(Date.now()));

    context.set(KeysExpressionEvaluator.baseIRI, context.get(KeysInitQuery.baseIRI));
    context.set(
      KeysExpressionEvaluator.functionArgumentsCache,
      context.get(KeysInitQuery.functionArgumentsCache) || {},
    );

    // Handle two variants of providing extension functions
    if (context.has(KeysInitQuery.extensionFunctionCreator) && context.has(KeysInitQuery.extensionFunctions)) {
      throw new Error('Illegal simultaneous usage of extensionFunctionCreator and extensionFunctions in context');
    }
    if (context.has(KeysInitQuery.extensionFunctionCreator)) {
      context.set(
        KeysExpressionEvaluator.extensionFunctionCreator,
        context.get(KeysInitQuery.extensionFunctionCreator),
      );
    } else if (context.has(KeysInitQuery.extensionFunctions)) {
      const extensionFunctions: Record<string, AsyncExtensionFunction> = context.getSafe(
        KeysInitQuery.extensionFunctions,
      );
      context.set(KeysExpressionEvaluator.extensionFunctionCreator,
        async(functionNamedNode: RDF.NamedNode) => extensionFunctions[functionNamedNode.value]);
    }

    context.set(
      KeysExpressionEvaluator.defaultTimeZone,
      context.get(KeysExpressionEvaluator.defaultTimeZone ||
        extractTimeZone(context.getSafe(KeysExpressionEvaluator.now))),
    );

    context.set(KeysExpressionEvaluator.mediatorQueryOperation, this.mediatorQueryOperation);
    context.set(KeysExpressionEvaluator.mediatorFunction, this.functionsBus);

    context.set(KeysExpressionEvaluator.superTypeProvider, {
      cache: new LRUCache({ max: 1_000 }),
      discoverer: () => 'term',
    });

    return context;
  }

  public readonly termComparatorBus: TermComparatorBus = async({ context, getSuperType }) =>
    new TermComparator(new InternalEvaluator(this.prepareEvaluatorActionContext(context)),
      await this.createFunction({ functionName: RegularOperator.EQUAL, context, requireTermExpression: true }),
      await this.createFunction({ functionName: RegularOperator.LT, context, requireTermExpression: true }));

  public constructor(args: IExpressionEvaluatorFactoryArgs) {
    this.mediatorBindingsAggregatorFactory = args.mediatorBindingsAggregatorFactory;
    this.mediatorQueryOperation = args.mediatorQueryOperation;
  }

  public async createEvaluator(algExpr: Alg.Expression, context: IActionContext): Promise<IExpressionEvaluator> {
    const fullContext = this.prepareEvaluatorActionContext(context);
    return new ExpressionEvaluator(
      fullContext,
      await new AlgebraTransformer(
        context.getSafe(KeysExpressionEvaluator.superTypeProvider),
        this.functionsBus,
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

  public createFunction = this.functionsBus;

  public async createTermComparator(orderAction: ITermComparatorBusActionContext):
  Promise<IOrderByEvaluator> {
    return this.termComparatorBus(orderAction);
  }
}

interface IExpressionEvaluatorFactoryArgs {
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  mediatorQueryOperation: MediatorQueryOperation;
}
