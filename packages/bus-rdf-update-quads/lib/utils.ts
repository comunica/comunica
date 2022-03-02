import { KeysRdfUpdateQuads } from '@comunica/context-entries';
import type { IActionContext, IDataDestination } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * Check if the given data destination is a string or RDF store.
 * @param dataDestination A data destination.
 */
export function isDataDestinationRawType(dataDestination: IDataDestination): dataDestination is string | RDF.Store {
  return typeof dataDestination === 'string' || 'remove' in dataDestination;
}

/**
 * Get the data destination type.
 * @param dataDestination A data destination.
 */
export function getDataDestinationType(dataDestination: IDataDestination): string | undefined {
  if (typeof dataDestination === 'string') {
    return '';
  }
  return 'remove' in dataDestination ? 'rdfjsStore' : dataDestination.type;
}

/**
 * Get the data destination value.
 * @param dataDestination A data destination.
 */
export function getDataDestinationValue(dataDestination: IDataDestination): string | RDF.Store {
  return isDataDestinationRawType(dataDestination) ? dataDestination : dataDestination.value;
}

/**
 * Get the context of the given destination, merged with the given context.
 * @param dataDestination A data destination.
 * @param context A context to merge with.
 */
export function getDataDestinationContext(dataDestination: IDataDestination, context: IActionContext): IActionContext {
  if (typeof dataDestination === 'string' || 'remove' in dataDestination || !dataDestination.context) {
    return context;
  }
  return context.merge(dataDestination.context);
}

/**
 * Get the source destination from the given context.
 * @param {ActionContext} context An optional context.
 * @return {IDataDestination} The destination or undefined.
 */
export function getContextDestination(context: IActionContext): IDataDestination | undefined {
  return context.get(KeysRdfUpdateQuads.destination);
}

/**
 * Get the single destination if the context contains just a single destination.
 * @param {ActionContext} context A context, can be null.
 * @return {IDataDestination} The single datadestination or undefined.
 */
export function getContextDestinationFirst(context: IActionContext): IDataDestination | undefined {
  if (context.has(KeysRdfUpdateQuads.destination)) {
    // If the single destination is set
    return context.get(KeysRdfUpdateQuads.destination);
  }
}

/**
 * Get the destination's raw URL value from the given context.
 * @param {IDataDestination} destination A destination.
 * @return {string} The URL or undefined.
 */
export function getContextDestinationUrl(destination?: IDataDestination): string | undefined {
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
