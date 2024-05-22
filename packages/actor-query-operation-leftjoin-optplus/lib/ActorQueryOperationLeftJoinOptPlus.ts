import { ActorQueryOperationLeftJoinAbstract } from '@comunica/actor-query-operation-leftjoin';
import type { IActionRdfJoin } from '@comunica/bus-rdf-join';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { UnionIterator } from 'asynciterator';

/**
 * A comunica OPT+ LeftJoin Query Operation Actor.
 */
export class ActorQueryOperationLeftJoinOptPlus extends ActorQueryOperationLeftJoinAbstract {
  public async join({ entries, context }: IActionRdfJoin): Promise<IQueryOperationResultBindings> {
    const clonedStream = entries[0].output.bindingsStream.clone();
    entries[0].output.bindingsStream = entries[0].output.bindingsStream.clone();
    const joined = await this.mediatorJoin.mediate({ type: 'inner', entries, context });
    joined.bindingsStream = new UnionIterator([ clonedStream, joined.bindingsStream ], { autoStart: false });
    return joined;
  }
}
