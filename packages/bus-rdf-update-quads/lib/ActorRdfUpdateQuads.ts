import type { IAction, IActorArgs, IActorOutput, IActorTest, ActionContext } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';

/**
 * @type {string} Context entry for a data destination.
 * @value {IDataDestination} A destination.
 */
export const KEY_CONTEXT_DESTINATION = '@comunica/bus-rdf-update-quads:destination';

export function isDataDestinationRawType(dataDestination: IDataDestination): dataDestination is string | RDF.Store {
  return typeof dataDestination === 'string' || 'remove' in dataDestination;
}
export function getDataDestinationType(dataDestination: IDataDestination): string | undefined {
  if (typeof dataDestination === 'string') {
    return '';
  }
  return 'remove' in dataDestination ? 'rdfjsStore' : dataDestination.type;
}
export function getDataDestinationValue(dataDestination: IDataDestination): string | RDF.Store {
  return isDataDestinationRawType(dataDestination) ? dataDestination : dataDestination.value;
}
export function getDataDestinationContext(dataDestination: IDataDestination, context: ActionContext): ActionContext {
  if (typeof dataDestination === 'string' || 'remove' in dataDestination || !dataDestination.context) {
    return context;
  }
  return context.merge(dataDestination.context);
}

/**
 * A comunica actor for rdf-update-quads events.
 *
 * Actor types:
 * * Input:  IActionRdfUpdateQuads:      Quad insertion and deletion streams.
 * * Test:   <none>
 * * Output: IActorRdfUpdateQuadsOutput: A promise resolving when the update operation is done.
 *
 * @see IActionRdfUpdateQuads
 * @see IActorRdfUpdateQuadsOutput
 */
export abstract class ActorRdfUpdateQuads extends Actor<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput> {
  public constructor(args: IActorArgs<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>) {
    super(args);
  }

  /**
   * Get the destination from the given context.
   * @param {ActionContext} context An optional context.
   * @return {IDataDestination} The destination or undefined.
   */
  protected getContextDestination(context?: ActionContext): IDataDestination | undefined {
    return context ? context.get(KEY_CONTEXT_DESTINATION) : undefined;
  }

  /**
   * Get the destination's raw URL value from the given context.
   * @param {IDataDestination} destination A destination.
   * @return {string} The URL or undefined.
   */
  protected getContextDestinationUrl(destination?: IDataDestination): string | undefined {
    if (destination) {
      let fileUrl = getDataDestinationValue(destination);
      if (typeof fileUrl === 'string') {
        // Remove hashes from source
        const hashPosition = fileUrl.indexOf('#');
        if (hashPosition >= 0) {
          fileUrl = fileUrl.slice(0, hashPosition);
        }

        return fileUrl;
      }
    }
  }
}

export type IDataDestination = string | RDF.Store | {
  type?: string;
  value: string | RDF.Store;
  context?: ActionContext;
};

export interface IActionRdfUpdateQuads extends IAction {
  /**
   * An optional stream of quads to insert.
   */
  quadStreamInsert?: AsyncIterator<RDF.Quad>;
  /**
   * An optional stream of quads to delete.
   */
  quadStreamDelete?: AsyncIterator<RDF.Quad>;
}

export interface IActorRdfUpdateQuadsOutput extends IActorOutput {
  /**
   * Resolves when the update operation is done.
   */
  updateResult: Promise<void>;
}
