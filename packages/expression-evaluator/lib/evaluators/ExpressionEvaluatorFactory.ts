import type { MediatorBindingsAggregatorFactory } from '@comunica/bus-bindings-aggeregator-factory';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActionContext,
  IBindingsAggregator,
  IExpressionEvaluator,
  IExpressionEvaluatorFactory,
  FunctionBusType, IOrderByEvaluator,
  FunctionExpression, ITermFunction, OrderByBus,
  IEvalContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type * as E from '../expressions';
import { FunctionDefinition, namedFunctions, regularFunctions, specialFunctions } from '../functions';
import type * as C from '../util/Consts';
import { RegularOperator } from '../util/Consts';
import type { IAsyncEvaluatorContext, AsyncExtensionFunction } from './ContextualizedEvaluator';
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
        return new NamedExtension(definition);
      }
    }
    const extensionMap: Record<string, (args: RDF.Term[]) => Promise<RDF.Term>> | undefined =
      context.get(KeysInitQuery.extensionFunctions);
    if (extensionMap) {
      const definition = extensionMap[functionName];
      if (definition) {
        return new NamedExtension(definition);
      }
    }
    throw new Error('nah!');
  };

  public readonly orderByBus: OrderByBus = async({ context }) =>
    new OrderByEvaluator(new ContextualizedEvaluator({
      now: context.get(KeysInitQuery.queryTimestamp),
      baseIRI: context.get(KeysInitQuery.baseIRI),
      functionArgumentsCache: context.get(KeysInitQuery.functionArgumentsCache),
      actionContext: context,
      mediatorQueryOperation: this.mediatorQueryOperation,
      mediatorFunction: this.functionsBus,
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

  public async createOrderByEvaluator(context: IActionContext):
  Promise<IOrderByEvaluator> {
    return this.orderByBus({ context });
  }
}

interface IExpressionEvaluatorFactoryArgs {
  mediatorBindingsAggregatorFactory: MediatorBindingsAggregatorFactory;
  mediatorQueryOperation: MediatorQueryOperation;
}

// TODO: this thing will be it's own actor but it's just a little special.
//  It will also be the only consumer of the context items:
//  KeysInitQuery.extensionFunctions and KeysInitQuery.extensionFunctionCreator
class NamedExtension extends FunctionDefinition {
  // TODO: the context should be checked in the test part of the actor.
  //  The fact that this can be done is async now is a nice feature!
  //  It means that named function definitions could be queried over the web!
  // TODO: when all is done, this should be injected in some way!
  protected arity = Number.POSITIVE_INFINITY;
  public constructor(private readonly functionDefinition: AsyncExtensionFunction) {
    super();
  }

  public apply = async({ args, exprEval, mapping }: IEvalContext): Promise<E.TermExpression> => {
    const evaluatedArgs: E.Term[] = await Promise.all(args.map(arg => exprEval.evaluateAsInternal(arg, mapping)));
    return exprEval.transformer.transformRDFTermUnsafe(
      await this.functionDefinition(evaluatedArgs.map(term => term.toRDF())),
    );
  };
}
