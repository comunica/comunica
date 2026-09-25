import { ActorRdfJoinMultiBind } from '@comunica/actor-rdf-join-inner-multi-bind';
import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import {
  ActorRdfJoin,
} from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { failTest, passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream, IActionContext, IExpressionEvaluator, IJoinEntry } from '@comunica/types';
import { Algebra, inScopeVariables } from '@comunica/utils-algebra';
import { isExpressionError } from '@comunica/utils-expression-evaluator';
import { NestedLoopJoin } from 'asyncjoin';

/**
 * A comunica Optional Nested Loop RDF Join Actor.
 */
export class ActorRdfJoinOptionalNestedLoop extends ActorRdfJoin {
  public readonly mediatorExpressionEvaluatorFactory?: MediatorExpressionEvaluatorFactory;

  public constructor(args: IActorRdfJoinOptionalNestedLoopArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'nested-loop',
      limitEntries: 2,
      canHandleUndefs: true,
      canHandleOperationRequired: Boolean(args.mediatorExpressionEvaluatorFactory),
    });
    this.mediatorExpressionEvaluatorFactory = args.mediatorExpressionEvaluatorFactory;
  }

  /**
   * Get the left join expression that was attached to the given (right) join entry, if any.
   * @param entry A join entry.
   */
  public static getLeftJoinExpression(entry: IJoinEntry): Algebra.Expression | undefined {
    if (entry.operationRequired && entry.operation.type === Algebra.Types.FILTER &&
      entry.operation.metadata?.isHoistedLeftJoinFilter) {
      return (<Algebra.Filter> entry.operation).expression;
    }
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const expression = ActorRdfJoinOptionalNestedLoop.getLeftJoinExpression(action.entries[1]);
    const bindingsStream = expression ?
      await this.joinWithExpression(action, expression) :
      new NestedLoopJoin<Bindings, Bindings, Bindings>(
        action.entries[0].output.bindingsStream,
        action.entries[1].output.bindingsStream,
        <any> ActorRdfJoin.joinBindings,
        { optional: true, autoStart: false },
      );
    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: async() => await this.constructResultMetadata(
          action.entries,
          await ActorRdfJoin.getMetadatas(action.entries),
          action.context,
          {},
          true,
        ),
      },
    };
  }

  /**
   * Left join in which joined bindings are only kept if the expression evaluates to true,
   * and left bindings without such joined bindings are kept as-is.
   * @param action The join action.
   * @param expression The left join expression.
   */
  protected async joinWithExpression(action: IActionRdfJoin, expression: Algebra.Expression):
  Promise<BindingsStream> {
    const evaluator = await this.mediatorExpressionEvaluatorFactory!
      .mediate({ algExpr: expression, context: action.context });
    let rightBindings: Promise<Bindings[]> | undefined;
    const bindingsStream: BindingsStream = action.entries[0].output.bindingsStream.transform<Bindings>({
      autoStart: false,
      // eslint-disable-next-line ts/no-misused-promises
      transform: async(left, done, push) => {
        try {
          rightBindings ??= action.entries[1].output.bindingsStream.toArray();
          let matched = false;
          for (const right of await rightBindings) {
            const joined = ActorRdfJoin.joinBindings(left, right);
            if (joined && await this.evaluateExpression(evaluator, joined, action.context)) {
              matched = true;
              push(joined);
            }
          }
          if (!matched) {
            push(left);
          }
        } catch (error: unknown) {
          bindingsStream.emit('error', error);
        }
        done();
      },
    });
    return bindingsStream;
  }

  /**
   * Evaluate the effective boolean value of an expression, where expression errors count as false.
   * @param evaluator An expression evaluator.
   * @param bindings Bindings to evaluate the expression on.
   * @param context The action context.
   */
  protected async evaluateExpression(
    evaluator: IExpressionEvaluator,
    bindings: Bindings,
    context: IActionContext,
  ): Promise<boolean> {
    try {
      return await evaluator.evaluateAsEBV(bindings);
    } catch (error: unknown) {
      if (isExpressionError(<Error> error)) {
        this.logWarn(context, 'Error occurred while evaluating a left join expression.', () => ({ error }));
        return false;
      }
      throw error;
    }
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    const { metadatas } = sideData;

    // Only left join expressions on operations that bind joins can not handle are supported here
    if (action.entries.some((entry, i) => ActorRdfJoin.isOperationRequired(entry, metadatas[i]))) {
      if (ActorRdfJoin.isOperationRequired(action.entries[0], metadatas[0]) ||
        Boolean(metadatas[1].operationRequired) ||
        !ActorRdfJoinOptionalNestedLoop.getLeftJoinExpression(action.entries[1])) {
        return failTest(`${this.name} can only handle operationRequired for left join expressions.`);
      }
      if (ActorRdfJoinMultiBind
        .canBindWithOperation(action.entries[1].operation, inScopeVariables(action.entries[0].operation))) {
        return failTest(`${this.name} only handles left join expressions on operations that can not be bound.`);
      }
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    return passTestWithSideData({
      iterations: metadatas[0].cardinality.value * metadatas[1].cardinality.value,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    }, sideData);
  }
}

export interface IActorRdfJoinOptionalNestedLoopArgs extends IActorRdfJoinArgs {
  /**
   * An optional mediator for creating expression evaluators.
   * If set, left join expressions on operations that can not be bound are supported.
   */
  mediatorExpressionEvaluatorFactory?: MediatorExpressionEvaluatorFactory;
}
