import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
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
import { DataFactory } from 'rdf-data-factory';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { namedFunctions, regularFunctions, specialFunctions } from '../functions';
import { NamedExtension } from '../functions/NamedExtension';
import type * as C from '../util/Consts';
import { RegularOperator } from '../util/Consts';
import { ExpressionEvaluator } from './ExpressionEvaluator';
import type { IAsyncEvaluatorContext } from './MaterializedEvaluatorContext';
import { MaterializedEvaluatorContext } from './MaterializedEvaluatorContext';
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

  public readonly termComparatorBus: TermComparatorBus = async({ context, getSuperType }) =>
    new TermComparator(new MaterializedEvaluatorContext({
      now: context.get(KeysInitQuery.queryTimestamp),
      baseIRI: context.get(KeysInitQuery.baseIRI),
      functionArgumentsCache: context.get(KeysInitQuery.functionArgumentsCache),
      actionContext: context,
      mediatorQueryOperation: this.mediatorQueryOperation,
      mediatorFunction: this.functionsBus,
      getSuperType,
    }),
    await this.createFunction({ functionName: RegularOperator.EQUAL, context, requireTermExpression: true }),
    await this.createFunction({ functionName: RegularOperator.LT, context, requireTermExpression: true }));

  public constructor(args: IExpressionEvaluatorFactoryArgs) {
    this.mediatorBindingsAggregatorFactory = args.mediatorBindingsAggregatorFactory;
    this.mediatorQueryOperation = args.mediatorQueryOperation;
  }

  // TODO: remove legacyContext in *final* update (probably when preparing the EE for function bussification)
  public async createEvaluator(algExpr: Alg.Expression, context: IActionContext,
    legacyContext: Partial<IAsyncEvaluatorContext> = {}): Promise<IExpressionEvaluator> {
    const defContextEval = new MaterializedEvaluatorContext({
      now: context.get(KeysInitQuery.queryTimestamp),
      baseIRI: context.get(KeysInitQuery.baseIRI),
      functionArgumentsCache: context.get(KeysInitQuery.functionArgumentsCache),
      actionContext: context,
      mediatorQueryOperation: this.mediatorQueryOperation,
      mediatorFunction: this.functionsBus,
      ...legacyContext,
    });
    return new ExpressionEvaluator(defContextEval, await defContextEval.transformer.transformAlgebra(algExpr));
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
