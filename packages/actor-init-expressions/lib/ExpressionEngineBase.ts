import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type {
  FunctionArgumentsCache,
  IActionContext,
  IBindingsAggregator,
  IExpressionEngine,
  IExpressionEvaluator,
  ITermComparator,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import type { ActorInitExpressions } from './ActorInitExpressions';

const DF = new DataFactory();

/**
 * Base implementation of a Comunica expression engine.
 */
export class ExpressionEngineBase implements IExpressionEngine {
  /**
   * Cache of resolved function overloads, shared by everything this engine creates.
   */
  private readonly functionArgumentsCache: FunctionArgumentsCache = {};

  public constructor(private readonly actorInitExpressions: ActorInitExpressions) {}

  public async createEvaluator(expression: Algebra.Expression, context?: IActionContext):
  Promise<IExpressionEvaluator> {
    return this.actorInitExpressions.mediatorExpressionEvaluatorFactory
      .mediate({ algExpr: expression, context: this.prepareContext(context) });
  }

  public async createTermComparator(context?: IActionContext): Promise<ITermComparator> {
    return this.actorInitExpressions.mediatorTermComparatorFactory.mediate({ context: this.prepareContext(context) });
  }

  public async createAggregator(expression: Algebra.AggregateExpression, context?: IActionContext):
  Promise<IBindingsAggregator> {
    return this.actorInitExpressions.mediatorBindingsAggregatorFactory
      .mediate({ expr: expression, context: this.prepareContext(context) });
  }

  /**
   * Default the context entries that every expression evaluator requires.
   * Engines can extend this with defaults that are specific to their configuration.
   * @param context The context provided by the caller.
   */
  protected prepareContext(context: IActionContext = new ActionContext()): IActionContext {
    return context
      .setDefault(KeysInitQuery.dataFactory, DF)
      .setDefault(KeysInitQuery.queryTimestamp, new Date())
      .setDefault(KeysInitQuery.functionArgumentsCache, this.functionArgumentsCache);
  }
}
