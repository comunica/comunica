import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { IActorQueryOperationOutput } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Query Operation Actor for BGPs with a single pattern.
 */
export class ActorQueryOperationBgpSingle extends ActorQueryOperationTypedMediated<Algebra.Bgp> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'bgp');
  }

  public async testOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorTest> {
    if (pattern.patterns.length !== 1) {
      throw new Error(`Actor ${this.name} can only operate on BGPs with a single pattern.`);
    }
    return true;
  }

  public runOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorQueryOperationOutput> {
    // If we have parent metadata, extract the single parent metadata entry.
    if (context && context.has(KeysQueryOperation.bgpParentMetadata)) {
      const metadatas = context.get(KeysQueryOperation.bgpParentMetadata);
      context = context.delete(KeysQueryOperation.bgpParentMetadata);
      context = context.set(KeysQueryOperation.patternParentMetadata, metadatas[0]);
    }

    return this.mediatorQueryOperation.mediate({ operation: pattern.patterns[0], context });
  }
}
