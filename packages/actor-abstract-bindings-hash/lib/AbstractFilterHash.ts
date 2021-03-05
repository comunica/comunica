import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext } from '@comunica/core';
import type { Bindings, IActorQueryOperationOutputBindings } from '@comunica/types';
import { sha1 } from 'hash.js';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Hash Query Operation Actor.
 */
export abstract class AbstractFilterHash<T extends Algebra.Operation> extends ActorQueryOperationTypedMediated<T>
  implements IActorInitRdfDereferencePagedArgs {
  public constructor(args: IActorInitRdfDereferencePagedArgs, operator: string) {
    super(args, operator);
  }

  /**
   * Create a string-based hash of the given object.
   * @param {Bindings} bindings The bindings to hash.
   * @return {string} The object's hash.
   */
  public static hash(bindings: Bindings): string {
    return sha1()
      .update(require('canonicalize')(bindings.map(x => termToString(x))))
      .digest('hex');
  }

  public abstract runOperation(pattern: T, context: ActionContext): Promise<IActorQueryOperationOutputBindings>;
}

export interface IActorInitRdfDereferencePagedArgs extends IActorQueryOperationTypedMediatedArgs {

}
