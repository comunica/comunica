import type { IActorIteratorTransformArgs, ITransformIteratorOutput } from '@comunica/bus-iterator-transform';
import { ActorIteratorTransform } from '@comunica/bus-iterator-transform';
import { KeysStatistics } from '@comunica/context-entries';
import type { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';
import type { IActionContext, MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Count Intermediate Results Iterator Transform Actor.
 */
export class ActorIteratorTransformRecordIntermediateResults
  extends ActorIteratorTransform<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>, MetadataBindings | MetadataQuads> {
  public constructor(args: IActorIteratorTransformArgs) {
    super(args);
  }

  public transformIterator<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>, M extends MetadataBindings | MetadataQuads>(
    operation: string,
    stream: T,
    streamMetadata: () => Promise<M>,
    context: IActionContext,
    metadata?: Record<string, any>,
  ): ITransformIteratorOutput<T, M> {
    const statisticIntermediateResults: StatisticIntermediateResults = context.getSafe(KeysStatistics.intermediateResults);
    const output = <T> stream.map((data) => {
      statisticIntermediateResults.updateStatistic({ data, metadata: { operation, time: Date.now(), ...metadata }});
      return data;
    });
    // Return metadata unchanged
    return { stream: output, streamMetadata };
  }
}
