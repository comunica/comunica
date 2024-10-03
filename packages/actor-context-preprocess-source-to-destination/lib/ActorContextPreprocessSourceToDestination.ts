import type { IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysInitQuery, KeysRdfUpdateQuads } from '@comunica/context-entries';
import type { IActorTest, IAction, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { QuerySourceUnidentified } from '@comunica/types';

/**
 * A comunica Source To Destination Context Preprocess Actor.
 */
export class ActorContextPreprocessSourceToDestination extends ActorContextPreprocess {
  public constructor(args: IActorContextPreprocessArgs) {
    super(args);
  }

  public async test(_action: IAction): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    if (action.context.get(KeysInitQuery.querySourcesUnidentified) &&
      !action.context.get(KeysRdfUpdateQuads.destination)) {
      const sources: QuerySourceUnidentified[] = action.context.get(KeysInitQuery.querySourcesUnidentified)!;
      if (sources.length === 1) {
        return { context: action.context.set(KeysRdfUpdateQuads.destination, sources[0]) };
      }
    }
    return action;
  }
}
