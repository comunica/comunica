import type { MediatorProcessIterator } from '@comunica/bus-process-iterator';
import type {
  IActionQueryOperation,
  IActorQueryOperationArgs,
  MediatorQueryOperation,
} from '@comunica/bus-query-operation';
import { ActorQueryOperation, KEY_CONTEXT_WRAPPED_QUERY_OPERATION } from '@comunica/bus-query-operation';
import { ActionContextKey, type IActorTest } from '@comunica/core';
import type { IQueryOperationResult } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Wrap Stream Query Operation Actor.
 */
export class ActorQueryOperationWrapStream extends ActorQueryOperation {
  public readonly mediatorProcessIterator: MediatorProcessIterator;
  public readonly mediatorQueryOperation: MediatorQueryOperation;

  public constructor(args: IActorQueryOperationWrapStreamArgs) {
    super(args);
  }

  public async test(action: IActionQueryOperation): Promise<IActorTest> {
    if (action.context.get(KEY_CONTEXT_WRAPPED_QUERY_OPERATION)) {
      throw new Error('Unable to wrap query source multiple times');
    }
    // Ensure this is always run if not already wrapped
    return { httpRequests: Number.NEGATIVE_INFINITY };
  }

  public async run(action: IActionQueryOperation): Promise<IQueryOperationResult> {
    // Prevent infinite recursion. In consequent query operation calls this key should be set to false
    // To allow the operation to wrap ALL query operation runs
    action.context = ActorQueryOperation.setContextWrapped(action.context, true);

    // TODO how can I know what actor actually did the task? Without using this ugly mf
    const nameMap = new Map<string, string>();
    action.context = action.context.set(new ActionContextKey('test-map-name-actor'), nameMap);

    const output: IQueryOperationResult = await this.mediatorQueryOperation.mediate(action);
    switch (output.type) {
      case 'bindings':
        output.bindingsStream = <AsyncIterator<RDF.Bindings>>
        (await this.mediatorProcessIterator.mediate(
          { operation: action.operation.name, stream: output.bindingsStream, context: action.context, metadata: {
            type: output.type,
            actor: '',
            ...await output.metadata(),
            ...output.context,
          }},
        )).stream;
        break;
      case 'quads':
        output.quadStream = <AsyncIterator<RDF.Quad>>
        (await this.mediatorProcessIterator.mediate(
          { operation: action.operation.name, stream: output.quadStream, context: action.context, metadata: {
            type: output.type,
            actor: '',
            ...await output.metadata(),
            ...output.context,
          }},
        )).stream;
        break;
      default:
        break;
    }
    return output;
  }
}

export interface IActorQueryOperationWrapStreamArgs extends IActorQueryOperationArgs {
  /**
   * Mediator that runs all transforms defined by user over the output stream of the query operation
   */
  mediatorProcessIterator: MediatorProcessIterator;
  /**
   * Mediator that runs the next query operation
   */
  mediatorQueryOperation: MediatorQueryOperation;
}
