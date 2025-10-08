import type { IActionQueryOperation, IActorQueryOperationArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTest } from '@comunica/core';
import type {
  IPhysicalQueryPlanLogger,
  IQueryOperationResult,
  IQuerySourceWrapper,
} from '@comunica/types';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import { getMetadataBindings, getMetadataQuads } from '@comunica/utils-metadata';
import { getOperationSource } from '@comunica/utils-query-operation';

/**
 * A comunica Source Query Operation Actor.
 */
export class ActorQueryOperationSource extends ActorQueryOperation {
  public constructor(args: IActorQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionQueryOperation): Promise<TestResult<IActorTest>> {
    if (!getOperationSource(action.operation)) {
      return failTest(`Actor ${this.name} requires an operation with source annotation.`);
    }
    return passTest({ httpRequests: 1 });
  }

  public async run(action: IActionQueryOperation): Promise<IQueryOperationResult> {
    // Log to physical plan
    const physicalQueryPlanLogger: IPhysicalQueryPlanLogger | undefined = action.context
      .get(KeysInitQuery.physicalQueryPlanLogger);
    if (physicalQueryPlanLogger) {
      physicalQueryPlanLogger.logOperation(
        action.operation.type,
        undefined,
        action.operation,
        action.context.get(KeysInitQuery.physicalQueryPlanNode),
        this.name,
        {},
      );
      action.context = action.context.set(KeysInitQuery.physicalQueryPlanNode, action.operation);
    }

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
