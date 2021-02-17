import type { IActorContextPreprocessOutput } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { IActorArgs, IActorTest, IAction } from '@comunica/core';

/**
 * A comunica Source To Destination Context Preprocess Actor.
 */
export class ActorContextPreprocessSourceToDestination extends ActorContextPreprocess {
  public constructor(args: IActorArgs<IAction, IActorTest, IActorContextPreprocessOutput>) {
    super(args);
  }

  public async test(action: IAction): Promise<IActorTest> {
    return true;
  }

  public async run(action: IAction): Promise<IActorContextPreprocessOutput> {
    if (action.context && action.context.get(KEY_CONTEXT_SOURCES) && !action.context.get(KEY_CONTEXT_DESTINATION)) {
      const sources = action.context.get(KEY_CONTEXT_SOURCES);
      if (sources.length === 1) {
        return { context: action.context.set(KEY_CONTEXT_DESTINATION, sources[0]) };
      }
    }
    return action;
  }
}

export const KEY_CONTEXT_SOURCES = '@comunica/bus-rdf-resolve-quad-pattern:sources';
export const KEY_CONTEXT_DESTINATION = '@comunica/bus-rdf-update-quads:destination';
