import type {
  IActionIteratorTransformBindings,
  IActionIteratorTransformQuad,
  ITransformIteratorOutput }
  from '@comunica/bus-iterator-transform';
import { ActorIteratorTransform } from '@comunica/bus-iterator-transform';
import { KeysStatistics } from '@comunica/context-entries';
import type { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';
import type { MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Record Intermediate Results Iterator Transform Actor.
 * This actor simply updates the intermediate result statistic when an intermediate result is produced.
 */
export class ActorIteratorTransformRecordIntermediateResults extends ActorIteratorTransform {
  public async transformIteratorBindings(action: IActionIteratorTransformBindings):
  Promise<ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings>> {
    const statisticIntermediateResults: StatisticIntermediateResults = action.context
      .getSafe(KeysStatistics.intermediateResults);
    const output = action.stream.map((data) => {
      statisticIntermediateResults.updateStatistic(
        {
          type: <'bindings'> action.type,
          data,
          metadata: {
            operation: action.operation,
            ...action.metadata,
          },
        },
      );
      return data;
    });
    return { stream: output, metadata: <() => Promise<MetadataBindings>> action.metadata };
  }

  public async transformIteratorQuad(action: IActionIteratorTransformQuad):
  Promise<ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>> {
    const statisticIntermediateResults: StatisticIntermediateResults = action.context
      .getSafe(KeysStatistics.intermediateResults);
    const output = action.stream.map((data) => {
      statisticIntermediateResults.updateStatistic(
        {
          type: <'quad'> action.type,
          data,
          metadata: {
            operation: action.operation,
            ...action.metadata,
          },
        },
      );
      return data;
    });
    return { stream: output, metadata: <() => Promise<MetadataQuads>> action.metadata };
  }
}
