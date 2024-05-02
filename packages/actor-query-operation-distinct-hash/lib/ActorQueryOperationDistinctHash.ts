import { IActorOutputAbstractMediaTyped } from '@comunica/actor-abstract-mediatyped';
import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
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
import { QuadStream } from '@comunica/types/lib/Quads';
import type { Algebra } from 'sparqlalgebrajs';
import { MediatorHashQuads } from '../../bus-hash-quads/lib';

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
    // How to know if we'll get quads or bindings?
    if (operation.input.type === "construct") {
      const outputQuads: IQueryOperationResultQuads = ActorQueryOperation.getSafeQuads(
        await this.mediatorQueryOperation.mediate({ operation: operation.input, context }),
      );

      const quadStream: QuadStream = outputQuads.quadStream.filter(await this.newHashFilterQuads(context)); // TODO typing

      return {
        type: 'quads',
        quadStream,
        metadata: outputQuads.metadata,
      };
    }

    const output: IQueryOperationResultBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: operation.input, context }),
    );
    // Check if the input resulted in quads or in bindings
    // If bindings then 
    const bindingsStream: BindingsStream = output.bindingsStream.filter(await this.newHashFilter(context));
    return {
      type: 'bindings',
      bindingsStream,
      metadata: output.metadata,
    };
    // If quads then
    // Use another filter function which uses another hash function
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
   * Create a new distinct filter function to hash Quads.
   * This will maintain an internal hash datastructure so that every bindings object only returns true once.
   * @param context The action context.
   * @return {(quads: any) => boolean} A distinct filter for bindings. //TODO typing
   */
  public async newHashFilterQuads(context: IActionContext): Promise<(quads: any) => boolean> { //TODO typing
    const { hashFunction } = await this.mediatorHashQuads.mediate({ allowHashCollisions: true, context });
    const hashes: Record<string, boolean> = {};
    return (quads: any) => { //TODO typ
      const hash: string = hashFunction(quads);

      return !(hash in hashes) && (hashes[hash] = true);
    };
  }
}

export interface IActorQueryOperationDistinctHashArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorHashBindings: MediatorHashBindings;
}
