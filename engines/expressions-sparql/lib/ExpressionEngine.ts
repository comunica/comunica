import type { IBindingsAggregator } from '@comunica/bus-bindings-aggregator-factory';
import type { ITermComparator } from '@comunica/bus-term-comparator-factory';
import { KeysExpressionEvaluator, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type {
  ExistenceResolver,
  FunctionArgumentsCache,
  IActionContext,
  IExpressionEvaluator,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import type { ActorInitExpressions } from './ActorInitExpressions';

// eslint-disable-next-line import/extensions,ts/no-require-imports,ts/no-var-requires
const engineDefault = require('../engine-default.js');

const DF = new DataFactory();

/**
 * Used when the caller did not provide an existence resolver.
 * This engine configures no query operations, so it cannot evaluate the sub-query of an EXISTS itself.
 */
const unsupportedExistence: ExistenceResolver = () => {
  throw new Error(`Evaluating EXISTS requires a ${KeysExpressionEvaluator.existenceResolver.name} in the context`);
};

/**
 * A Comunica engine for evaluating SPARQL expressions, without executing queries.
 */
export class ExpressionEngine {
  /**
   * Cache of resolved function overloads, shared by everything this engine creates.
   */
  private readonly functionArgumentsCache: FunctionArgumentsCache = {};

  public constructor(private readonly actor: ActorInitExpressions = engineDefault()) {}

  /**
   * Create an evaluator for a SPARQL expression, such as the expression of a `FILTER` clause.
   * @param expression The algebra of the expression to evaluate.
   * @param context An optional context, missing entries are defaulted.
   */
  public async createEvaluator(expression: Algebra.Expression, context?: IActionContext):
  Promise<IExpressionEvaluator> {
    return this.actor.mediatorExpressionEvaluatorFactory
      .mediate({ algExpr: expression, context: this.prepareContext(context) });
  }

  /**
   * Create a comparator that orders RDF terms as `ORDER BY` does.
   * @param context An optional context, missing entries are defaulted.
   */
  public async createTermComparator(context?: IActionContext): Promise<ITermComparator> {
    return this.actor.mediatorTermComparatorFactory.mediate({ context: this.prepareContext(context) });
  }

  /**
   * Create an aggregator for a SPARQL aggregate expression, such as `SUM(?x)`.
   * @param expression The algebra of the aggregate expression.
   * @param context An optional context, missing entries are defaulted.
   */
  public async createAggregator(expression: Algebra.AggregateExpression, context?: IActionContext):
  Promise<IBindingsAggregator> {
    return this.actor.mediatorBindingsAggregatorFactory
      .mediate({ expr: expression, context: this.prepareContext(context) });
  }

  /**
   * Default the context entries that every expression evaluator requires.
   * @param context The context provided by the caller.
   */
  private prepareContext(context: IActionContext = new ActionContext()): IActionContext {
    return context
      .setDefault(KeysInitQuery.dataFactory, DF)
      .setDefault(KeysInitQuery.queryTimestamp, new Date())
      .setDefault(KeysInitQuery.functionArgumentsCache, this.functionArgumentsCache)
      .setDefault(KeysExpressionEvaluator.existenceResolver, unsupportedExistence);
  }
}
