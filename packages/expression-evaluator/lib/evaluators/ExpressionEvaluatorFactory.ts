import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActionContext,
  IBindingsAggregator,
  IExpressionEvaluator,
  IExpressionEvaluatorFactory,
  FunctionBusType, IOrderByEvaluator,
  FunctionExpression, ITermFunction, OrderByBus, IOrderByBusActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { namedFunctions, regularFunctions, specialFunctions } from '../functions';
import { NamedExtension } from '../functions/NamedExtension';
import type * as C from '../util/Consts';
import { RegularOperator } from '../util/Consts';
import type { IAsyncEvaluatorContext } from './ContextualizedEvaluator';
import { ContextualizedEvaluator } from './ContextualizedEvaluator';
import { ExpressionEvaluator } from './ExpressionEvaluator';
import { OrderByEvaluator } from './OrderByEvaluator';

export class ExpressionEvaluatorFactory implements IExpressionEvaluatorFactory {
  public readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly functionsBus: FunctionBusType = async({ functionName, context }) => {
    const res: FunctionExpression | undefined = {
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
      const definition = extensionMap[functionName];
      if (definition) {
        return new NamedExtension(functionName, definition);
      }
    }
    throw new Error('No Function Actor Replied');
  };

  public readonly orderByBus: OrderByBus = async({ context, getSuperType }) =>
    new OrderByEvaluator(new ContextualizedEvaluator({
      now: context.get(KeysInitQuery.queryTimestamp),
      baseIRI: context.get(KeysInitQuery.baseIRI),
      functionArgumentsCache: context.get(KeysInitQuery.functionArgumentsCache),
      actionContext: context,
      mediatorQueryOperation: this.mediatorQueryOperation,
      mediatorFunction: this.functionsBus,
      getSuperType,
    }),
    <ITermFunction> await this.functionsBus({ functionName: RegularOperator.EQUAL, context, definitionType: 'onTerm' }),
    <ITermFunction> await this.functionsBus({ functionName: RegularOperator.LT, context, definitionType: 'onTerm' }));

  public constructor(args: IExpressionEvaluatorFactoryArgs) {
    this.mediatorBindingsAggregatorFactory = args.mediatorBindingsAggregatorFactory;
    this.mediatorQueryOperation = args.mediatorQueryOperation;
  }

  // TODO: remove legacyContext in *final* update (probably when preparing the EE for function bussification)
  public async createEvaluator(algExpr: Alg.Expression, context: IActionContext,
    contextEval?: ContextualizedEvaluator,
    legacyContext: Partial<IAsyncEvaluatorContext> = {}): Promise<IExpressionEvaluator> {
    if (!contextEval) {
      const defContextEval = new ContextualizedEvaluator({
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
    return new ExpressionEvaluator(contextEval, await contextEval.transformer.transformAlgebra(algExpr));
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

  public async createOrderByEvaluator(orderAction: IOrderByBusActionContext):
  Promise<IOrderByEvaluator> {
    return this.orderByBus(orderAction);
  }
}

interface IExpressionEvaluatorFactoryArgs {
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  mediatorQueryOperation: MediatorQueryOperation;
}
