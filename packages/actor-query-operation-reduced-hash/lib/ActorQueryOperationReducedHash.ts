import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  Bindings,
  BindingsStream,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
} from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { LRUCache } from 'lru-cache';

/**
 * A comunica Reduced Hash Query Operation Actor.
 */
export class ActorQueryOperationReducedHash extends ActorQueryOperationTypedMediated<Algebra.Reduced> {
  public readonly mediatorHashBindings: MediatorHashBindings;
  public readonly cacheSize: number;

  public constructor(args: IActorQueryOperationReducedHashArgs) {
    super(args, Algebra.Types.REDUCED);
    this.mediatorHashBindings = args.mediatorHashBindings;
    this.cacheSize = args.cacheSize;
  }

  public async testOperation(_operation: Algebra.Reduced, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Reduced, context: IActionContext): Promise<IQueryOperationResult> {
    const output: IQueryOperationResultBindings = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: operation.input, context }),
    );
    const variables = (await output.metadata()).variables.map(v => v.variable);
    const bindingsStream: BindingsStream = output.bindingsStream.filter(await this.newHashFilter(context, variables));
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
   * @param variables The variables to take into account while hashing.
   * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
   */
  public async newHashFilter(
    context: IActionContext,
    variables: RDF.Variable[],
  ): Promise<(bindings: Bindings) => boolean> {
    const { hashFunction } = await this.mediatorHashBindings.mediate({ context });
    const hashes = new LRUCache<number, boolean>({ max: this.cacheSize });
    return (bindings: Bindings) => {
      const hash: number = hashFunction(bindings, variables);
      if (hashes.has(hash)) {
        return false;
      }
      hashes.set(hash, true);
      return true;
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
