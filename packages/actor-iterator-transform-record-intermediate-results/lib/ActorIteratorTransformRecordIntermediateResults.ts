import type { IActorIteratorTransformArgs } from '@comunica/bus-iterator-transform';
import { ActorIteratorTransform } from '@comunica/bus-iterator-transform';
import { KeysStatistics } from '@comunica/context-entries';
import type { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';
import type { Bindings, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Count Intermediate Results Iterator Transform Actor.
 */
export class ActorIteratorTransformRecordIntermediateResults 
  extends ActorIteratorTransform<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>> {
  public constructor(args: IActorIteratorTransformArgs) {
    super(args);
  }

  public transformIterator<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>(
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
