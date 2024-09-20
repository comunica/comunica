import type { IActionIteratorTransform, IActorIteratorTransformArgs, ITransformIteratorOutput } from '@comunica/bus-iterator-transform';
import { ActorIteratorTransform } from '@comunica/bus-iterator-transform';
import { KeysStatistics } from '@comunica/context-entries';
import type { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';
import type { MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Count Intermediate Results Iterator Transform Actor. This actor simply updates the intermediate result
 * statistic when an intermediate result is produced.
 */
export class ActorIteratorTransformRecordIntermediateResults
  extends ActorIteratorTransform<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>, MetadataBindings | MetadataQuads> {
  public constructor(args: IActorIteratorTransformArgs) {
    super(args);
  }

  public async transformIterator<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>, M extends MetadataBindings | MetadataQuads>(
    action: IActionIteratorTransform<T, M>,
  ): Promise<ITransformIteratorOutput<T, M>> {
    const statisticIntermediateResults: StatisticIntermediateResults = action.context.getSafe(KeysStatistics.intermediateResults);
    const output = <T> action.stream.map((data) => {
      statisticIntermediateResults.updateStatistic(
        { data, metadata: { operation: action.operation, ...action.metadata }});
      return data;
    });
    // Return metadata unchanged
    return { stream: output, streamMetadata: action.streamMetadata };
  }
}
