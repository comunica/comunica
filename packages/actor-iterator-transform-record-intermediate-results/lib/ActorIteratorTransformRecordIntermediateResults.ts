import type {
  ActionIteratorTransform,
  IActionIteratorTransformBindings,
  IActionIteratorTransformQuads,
  IActorIteratorTransformArgs,
  ITransformIteratorOutput,
} from '@comunica/bus-iterator-transform';
import { ActorIteratorTransform } from '@comunica/bus-iterator-transform';
import { KeysStatistics } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { StatisticIntermediateResults } from '@comunica/statistic-intermediate-results';
import type { MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Record Intermediate Results Iterator Transform Actor.
 * This actor updates the intermediate result statistic when an intermediate result is produced.
 */
export class ActorIteratorTransformRecordIntermediateResults extends ActorIteratorTransform {
  public constructor(args: IActorIteratorTransformArgs) {
    super(args);
  }

  public async transformIteratorBindings(action: IActionIteratorTransformBindings):
  Promise<ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings>> {
    const statisticIntermediateResults = <StatisticIntermediateResults> action.context
      .getSafe(KeysStatistics.intermediateResults);
    const output = action.stream.map((data) => {
      statisticIntermediateResults.updateStatistic(
        {
          type: action.type,
          data,
          metadata: {
            operation: action.operation,
            metadata: action.metadata,
          },
        },
      );
      return data;
    });
    return { stream: output, metadata: action.metadata };
  }

  public async transformIteratorQuads(action: IActionIteratorTransformQuads):
  Promise<ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>> {
    const statisticIntermediateResults = <StatisticIntermediateResults> action.context
      .getSafe(KeysStatistics.intermediateResults);
    const output = action.stream.map((data) => {
      statisticIntermediateResults.updateStatistic(
        {
          type: action.type,
          data,
          metadata: {
            operation: action.operation,
            metadata: action.metadata,
          },
        },
      );
      return data;
    });
    return { stream: output, metadata: action.metadata };
  }

  public async testIteratorTransform(
    action: ActionIteratorTransform,
  ): Promise<TestResult<IActorTest>> {
    if (!action.context.has(KeysStatistics.intermediateResults)) {
      return failTest(
        `Missing required context value: ${KeysStatistics.intermediateResults.name}. It must be defined before running ${this.name}.`,
      );
    }
    return passTestVoid();
  }
}
