import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import type { MediatorHashQuads } from '@comunica/bus-hash-quads';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type {
  Bindings,
  BindingsStream,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
  IQueryOperationResultQuads,
} from '@comunica/types';
import type { Quad, QuadStream } from '@comunica/types/lib/Quads';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Distinct Hash Query Operation Actor.
 */
export class ActorQueryOperationDistinctHash extends ActorQueryOperationTypedMediated<Algebra.Distinct> {
  public readonly mediatorHashBindings: MediatorHashBindings;
  public readonly mediatorHashQuads: MediatorHashQuads;

  public constructor(args: IActorQueryOperationDistinctHashArgs) {
    super(args, 'distinct');
  }

  public async testOperation(_operation: Algebra.Distinct, _context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Distinct, context: IActionContext): Promise<IQueryOperationResult> {
    const output = await this.mediatorQueryOperation.mediate({ operation: operation.input, context });

    //TODO remove undefined check when mediatorHashQuads is made required
    if (output.type === 'quads' && this.mediatorHashQuads !== undefined) {
      const outputQuads: IQueryOperationResultQuads = ActorQueryOperation.getSafeQuads(
        output,
      );

      const quadStream: QuadStream = outputQuads.quadStream.filter(await this.newHashFilterQuads(context));
      return {
        type: 'quads',
        quadStream,
        metadata: outputQuads.metadata,
      };
    }

    const outputBindings: IQueryOperationResultBindings = ActorQueryOperation.getSafeBindings(
      output,
    );

    const bindingsStream: BindingsStream = outputBindings.bindingsStream.filter(await this.newHashFilter(context));
    return {
      type: 'bindings',
      bindingsStream,
      metadata: outputBindings.metadata,
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
    const hashes: Record<string, boolean> = {};
    return (bindings: Bindings) => {
      const hash: string = hashFunction(bindings);

      return !(hash in hashes) && (hashes[hash] = true);
    };
  }

  /**
   * Create a new distinct filter function to hash quads.
   * This will maintain an internal hash datastructure so that every quad object only returns true once.
   * @param context The action context.
   * @return {(quad: quad) => boolean} A distinct filter for quads.
   */
  public async newHashFilterQuads(context: IActionContext): Promise<(quad: Quad) => boolean> {
    //TODO this check can be removed when mediatorHashQuads is made required
    if (this.mediatorHashQuads === undefined) {
      return (_quad) => true;
    }
    const { hashFunction } = await this.mediatorHashQuads.mediate({ allowHashCollisions: true, context });
    const hashes: Record<string, boolean> = {};
    return (quad: Quad) => {
      const hash: string = hashFunction(quad);

      return !(hash in hashes) && (hashes[hash] = true);
    };
  }
}

export interface IActorQueryOperationDistinctHashArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorHashBindings: MediatorHashBindings;
  //TODO this field should be made required in the next major update
  mediatorHashQuads?: MediatorHashQuads;
}
