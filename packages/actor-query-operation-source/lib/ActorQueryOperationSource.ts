import type { IActionQueryOperation, IActorQueryOperationArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTest } from '@comunica/core';
import type {
  IPhysicalQueryPlanLogger,
  IPhysicalQueryPlanNode,
  IQueryOperationResult,
  IQuerySourceWrapper,
} from '@comunica/types';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import { getMetadataBindings, getMetadataQuads } from '@comunica/utils-metadata';
import { doesShapeAcceptOperation, getOperationSource } from '@comunica/utils-query-operation';

/**
 * The operation types that are reported when a source handles an operation itself.
 */
const NESTED_OPERATION_TYPES = new Set<string>(Object.values(Algebra.Types).filter(type => ![
  // Expressions are part of an operation, not operations of their own
  Algebra.Types.EXPRESSION,
  // Property path symbols describe a path, they are not evaluated separately
  Algebra.Types.ALT,
  Algebra.Types.INV,
  Algebra.Types.LINK,
  Algebra.Types.NPS,
  Algebra.Types.ONE_OR_MORE_PATH,
  Algebra.Types.SEQ,
  Algebra.Types.ZERO_OR_MORE_PATH,
  Algebra.Types.ZERO_OR_ONE_PATH,
].includes(<any> type)));

/**
 * A comunica Source Query Operation Actor.
 */
export class ActorQueryOperationSource extends ActorQueryOperation {
  public constructor(args: IActorQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionQueryOperation): Promise<TestResult<IActorTest>> {
    const source = getOperationSource(action.operation);
    if (!source) {
      return failTest(`Actor ${this.name} requires an operation with source annotation.`);
    }
    if (!doesShapeAcceptOperation(
      await source.source.getSelectorShape(action.context),
      action.operation,
      { wildcardAcceptAllExtensionFunctions: true },
    )) {
      return failTest(`Actor ${this.name} does not accept the operation ${action.operation.type}.`);
    }
    return passTest({ httpRequests: 1 });
  }

  public async run(action: IActionQueryOperation): Promise<IQueryOperationResult> {
    // Log to physical plan
    const physicalQueryPlanLogger: IPhysicalQueryPlanLogger | undefined = action.context
      .get(KeysInitQuery.physicalQueryPlanLogger);
    let planNode: IPhysicalQueryPlanNode | undefined;
    if (physicalQueryPlanLogger) {
      planNode = physicalQueryPlanLogger.logOperation({
        logicalOperator: action.operation.type,
        parentNode: action.context.get(KeysInitQuery.physicalQueryPlanNode),
        actor: this.name,
        operation: action.operation,
      });
      action.context = action.context.set(KeysInitQuery.physicalQueryPlanNode, planNode);

      // The source handles the whole operation itself, so no actor below reports what it contains.
      // Record the shape that was handed to it, so that the plan does not stop at a single node.
      this.logDelegatedOperations(physicalQueryPlanLogger, planNode, action.operation);
    }

    const output = await this.runDelegated(action);

    // Allow consumers of this output to find the node that produced it
    planNode?.setOutput(output);

    return output;
  }

  /**
   * Log the operations below the given one, which the source handles itself.
   * @param logger The physical query plan logger.
   * @param parentNode The node of the operation that was delegated.
   * @param operation The operation that was delegated.
   */
  protected logDelegatedOperations(
    logger: IPhysicalQueryPlanLogger,
    parentNode: IPhysicalQueryPlanNode,
    operation: Algebra.Operation,
  ): void {
    for (const subOperation of ActorQueryOperationSource.getSubOperations(operation)) {
      const node = logger.logOperation({
        logicalOperator: subOperation.type,
        parentNode,
        actor: this.name,
        operation: subOperation,
        metadata: { delegated: true },
      });
      this.logDelegatedOperations(logger, node, subOperation);
    }
  }

  /**
   * Obtain the operations that are directly nested within the given operation.
   *
   * Expressions and property path symbols are not included, as those are not operations
   * that a source evaluates separately.
   *
   * @param operation An operation.
   */
  public static getSubOperations(operation: Algebra.Operation): Algebra.Operation[] {
    const subOperations: Algebra.Operation[] = [];
    for (const value of Object.values(operation)) {
      for (const entry of Array.isArray(value) ? value : [ value ]) {
        if (ActorQueryOperationSource.isNestedOperation(entry)) {
          subOperations.push(entry);
        }
      }
    }
    return subOperations;
  }

  /**
   * If the given value is an operation that can be nested within another operation.
   * @param value Any value occurring within an operation.
   */
  public static isNestedOperation(value: any): value is Algebra.Operation {
    return Boolean(value) && typeof value === 'object' && NESTED_OPERATION_TYPES.has(value.type);
  }

  /**
   * Delegate the operation of the given action to its source.
   * @param action A query operation action with a source annotation.
   */
  protected async runDelegated(action: IActionQueryOperation): Promise<IQueryOperationResult> {
    const sourceWrapper: IQuerySourceWrapper = getOperationSource(action.operation)!;
    const mergedContext = sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context;

    // Check if the operation is a CONSTRUCT query
    // We recurse because it may be wrapped in other operations such as SLICE and FROM
    let construct = false;
    algebraUtils.visitOperation(action.operation, {
      [Algebra.Types.CONSTRUCT]: { preVisitor: () => {
        construct = true;
        return { shortcut: true };
      } },
    });
    // If so, delegate to queryQuads
    if (construct) {
      const quadStream = sourceWrapper.source.queryQuads(action.operation, mergedContext);
      const metadata = getMetadataQuads(quadStream);
      return {
        type: 'quads',
        quadStream,
        metadata,
      };
    }

    switch (action.operation.type) {
      case Algebra.Types.ASK:
        return {
          type: 'boolean',
          execute: () => sourceWrapper.source.queryBoolean(<Algebra.Ask>action.operation, mergedContext),
        };
      case Algebra.Types.COMPOSITE_UPDATE:
      case Algebra.Types.DELETE_INSERT:
      case Algebra.Types.LOAD:
      case Algebra.Types.CLEAR:
      case Algebra.Types.CREATE:
      case Algebra.Types.DROP:
      case Algebra.Types.ADD:
      case Algebra.Types.MOVE:
      case Algebra.Types.COPY:
        return {
          type: 'void',
          execute: () => sourceWrapper.source.queryVoid(action.operation, mergedContext),
        };
    }

    const bindingsStream = sourceWrapper.source.queryBindings(action.operation, mergedContext);
    const metadata = getMetadataBindings(bindingsStream);
    return {
      type: 'bindings',
      bindingsStream,
      metadata,
    };
  }
}
