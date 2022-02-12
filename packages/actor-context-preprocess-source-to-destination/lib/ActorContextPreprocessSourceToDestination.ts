import type { IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysRdfResolveQuadPattern, KeysRdfUpdateQuads } from '@comunica/context-entries';
import type { IActorTest, IAction } from '@comunica/core';
import type { DataSources } from '@comunica/types';

/**
 * A comunica Source To Destination Context Preprocess Actor.
 */
export class ActorContextPreprocessSourceToDestination extends ActorContextPreprocess {
  public constructor(args: IActorContextPreprocessArgs) {
    super(args);
  }

  public async test(action: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    if (action.context.get(KeysRdfResolveQuadPattern.sources) && !action.context.get(KeysRdfUpdateQuads.destination)) {
      const sources: DataSources = action.context.get(KeysRdfResolveQuadPattern.sources)!;
      if (sources.length === 1) {
        return { context: action.context.set(KeysRdfUpdateQuads.destination, sources[0]) };
      }
    }
    return action;
  }
}
