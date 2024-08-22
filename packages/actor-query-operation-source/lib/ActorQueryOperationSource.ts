import type { IActionQueryOperation, IActorQueryOperationArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { getMetadataBindings, getMetadataQuads } from '@comunica/metadata';
import type {
  IPhysicalQueryPlanLogger,
  IQueryOperationResult,
  IQuerySourceWrapper,
} from '@comunica/types';
import { Algebra, Util } from 'sparqlalgebrajs';

/**
 * A comunica Source Query Operation Actor.
 */
export class ActorQueryOperationSource extends ActorQueryOperation {
  public constructor(args: IActorQueryOperationArgs) {
    super(args);
  }

  public async test(action: IActionQueryOperation): Promise<IActorTest> {
    if (!ActorQueryOperation.getOperationSource(action.operation)) {
      throw new Error(`Actor ${this.name} requires an operation with source annotation.`);
    }
    return { httpRequests: 1 };
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

    const sourceWrapper: IQuerySourceWrapper = ActorQueryOperation.getOperationSource(action.operation)!;
    const mergedContext = sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context;

    // Check if the operation is a CONSTRUCT query
    // We recurse because it may be wrapped in other operations such as SLICE and FROM
    let construct = false;
    Util.recurseOperation(action.operation, {
      construct(): boolean {
        construct = true;
        return false;
      },
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

    // eslint-disable-next-line ts/switch-exhaustiveness-check
    switch (action.operation.type) {
      case Algebra.types.ASK:
        return {
          type: 'boolean',
          execute: () => sourceWrapper.source.queryBoolean(<Algebra.Ask>action.operation, mergedContext),
        };
      case Algebra.types.COMPOSITE_UPDATE:
      case Algebra.types.DELETE_INSERT:
      case Algebra.types.LOAD:
      case Algebra.types.CLEAR:
      case Algebra.types.CREATE:
      case Algebra.types.DROP:
      case Algebra.types.ADD:
      case Algebra.types.MOVE:
      case Algebra.types.COPY:
        return {
          type: 'void',
          execute: () => sourceWrapper.source.queryVoid(<Algebra.Update>action.operation, mergedContext),
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
