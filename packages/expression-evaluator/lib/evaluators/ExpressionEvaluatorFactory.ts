import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type {
  IActionContext,
  IBindingsAggregator,
  IExpressionEvaluator,
  IExpressionEvaluatorFactory,
  FunctionBusType, TermFunctionBusType, IOrderByEvaluator,
} from '@comunica/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type * as E from '../expressions';
import type { TermSparqlFunction, SparqlFunction } from '../functions';
import { namedFunctions, regularFunctions, specialFunctions } from '../functions';
import type * as C from '../util/Consts';
import { RegularOperator } from '../util/Consts';
import type { IAsyncEvaluatorContext } from './ContextualizedEvaluator';
import { ContextualizedEvaluator } from './ContextualizedEvaluator';
import { ExpressionEvaluator } from './ExpressionEvaluator';
import { OrderByEvaluator } from './OrderByEvaluator';

export class ExpressionEvaluatorFactory implements IExpressionEvaluatorFactory {
  public readonly mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly functionsBus: FunctionBusType = async({ functionName }) => {
    const res: SparqlFunction | undefined = {
      ...regularFunctions,
      ...specialFunctions,
      ...namedFunctions,
    }[<C.NamedOperator | C.Operator> functionName];
    if (res) {
      return res;
    }
    throw new Error('nah!');
  };

  public readonly termFunctionsBus: TermFunctionBusType = async({ functionName }) => {
    const res: TermSparqlFunction<any> | undefined = {
      ...regularFunctions,
      ...namedFunctions,
    }[<C.NamedOperator | C.RegularOperator> functionName];
    if (res) {
      return res;
    }
    throw new Error('nah!');
  };

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
        mediatorTermFunction: this.termFunctionsBus,
        ...legacyContext,
      });
      return new ExpressionEvaluator(defContextEval, await defContextEval.translate(algExpr));
    }
    return new ExpressionEvaluator(contextEval, await contextEval.translate(algExpr));
  }

  public async createAggregator(algExpr: Alg.AggregateExpression, context: IActionContext):
  Promise<IBindingsAggregator> {
    return (await this.mediatorBindingsAggregatorFactory.mediate({
      expr: algExpr,
      factory: this,
      context,
    })).aggregator;
  }

  public createTermFunction(arg: { functionName: string; arguments?: E.TermExpression[] }):
  Promise<TermSparqlFunction<any>> {
    return this.termFunctionsBus(arg);
  }

  public createFunction(arg: { functionName: string; arguments: Alg.Expression[] }): Promise<SparqlFunction> {
    return this.functionsBus(arg);
  }

  public async createOrderByEvaluator(context: IActionContext, legacyContext: Partial<IAsyncEvaluatorContext> = {}):
  Promise<IOrderByEvaluator> {
    return new OrderByEvaluator({
      now: context.get(KeysInitQuery.queryTimestamp),
      baseIRI: context.get(KeysInitQuery.baseIRI),
      functionArgumentsCache: context.get(KeysInitQuery.functionArgumentsCache),
      actionContext: context,
      mediatorQueryOperation: this.mediatorQueryOperation,
      mediatorFunction: this.functionsBus,
      mediatorTermFunction: this.termFunctionsBus,
      ...legacyContext,
    },
    await this.createTermFunction({ functionName: RegularOperator.EQUAL }),
    await this.createTermFunction({ functionName: RegularOperator.LT }));
  }
}

interface IExpressionEvaluatorFactoryArgs {
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  mediatorQueryOperation: MediatorQueryOperation;
}
