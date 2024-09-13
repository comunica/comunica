import type { IActorProcessIteratorArgs } from '@comunica/bus-process-iterator';
import { ActorProcessIterator } from '@comunica/bus-process-iterator';
import { KeysStatistics } from '@comunica/context-entries';
import type { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';
import type { Bindings, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Count Intermediate Results Process Iterator Actor.
 */
export class ActorProcessIteratorRecordIntermediateResults extends ActorProcessIterator<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>> {
  public constructor(args: IActorProcessIteratorArgs) {
    super(args);
  }

  public processStream<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>(
    operation: string,
    stream: T,
    context: IActionContext,
    metadata?: Record<string, any>,
  ): T {
    const statisticIntermediateResults: StatisticIntermediateResults = context.getSafe(KeysStatistics.intermediateResults);
    const output = <T> stream.map((data) => {
      statisticIntermediateResults.updateStatistic({ data, metadata: { operation, time: Date.now(), ...metadata }});
      return data;
    });
    return output;
  }
}

export interface IPartialResult {
  data: Bindings | RDF.Quad;
  metadata: Record<string, any>;
}
