import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type {
  Bindings, BindingsStream, IActionContext, IQueryOperationResult, IQueryOperationResultBindings,
} from '@comunica/types';
import LRU = require('lru-cache');
import type { Algebra } from 'sparqlalgebrajs';
/**
 * A comunica Reduced Hash Query Operation Actor.
 */
export class ActorQueryOperationReducedHash extends ActorQueryOperationTypedMediated<Algebra.Reduced> {
  public readonly mediatorHashBindings: MediatorHashBindings;
  public readonly cacheSize: number;

  public constructor(args: IActorQueryOperationReducedHashArgs) {
    super(args, 'reduced');
  }

  public async testOperation(operation: Algebra.Reduced, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Reduced, context: IActionContext): Promise<IQueryOperationResult> {
    const output: IQueryOperationResultBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: operation.input, context }),
    );
    const bindingsStream: BindingsStream = output.bindingsStream.filter(await this.newHashFilter(context));
    return {
      type: 'bindings',
      bindingsStream,
      metadata: output.metadata,
    };
  }

  /**
   * Create a new distinct filter function.
   * This will maintain an internal hash datastructure so that every bindings object only returns true once.
   * @param context The action context.
   * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
   */
  public async newHashFilter(context: IActionContext): Promise<(bindings: Bindings) => boolean> {
    const { hashFunction } = await this.mediatorHashBindings.mediate({ allowHashCollisions: true, context });
    const hashes = new LRU<string, boolean>({ max: this.cacheSize });
    return (bindings: Bindings) => {
      const hash: string = hashFunction(bindings);
      return !hashes.has(hash) && hashes.set(hash, true);
    };
  }
}

export interface IActorQueryOperationReducedHashArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorHashBindings: MediatorHashBindings;
  /**
   * @range {integer}
   * @default {100}
   */
  cacheSize: number;
}
