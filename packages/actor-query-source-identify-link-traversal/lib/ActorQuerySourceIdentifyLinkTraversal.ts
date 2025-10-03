import type {
  IActionQuerySourceIdentify,
  IActorQuerySourceIdentifyOutput,
  IActorQuerySourceIdentifyArgs,
} from '@comunica/bus-query-source-identify';
import { ActorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysQuerySourceIdentify } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid, failTest, ActionContext } from '@comunica/core';
import { QuerySourceLinkTraversal } from './QuerySourceLinkTraversal';

/**
 * A comunica Link Traversal Query Source Identify Actor.
 */
export class ActorQuerySourceIdentifyLinkTraversal extends ActorQuerySourceIdentify {
  public constructor(args: IActorQuerySourceIdentifyArgs) {
    super(args);
  }

  public async test(action: IActionQuerySourceIdentify): Promise<TestResult<IActorTest>> {
    if (!action.querySourceUnidentified.context?.has(KeysQuerySourceIdentify.linkTraversalManager)) {
      return failTest(`${this.name} requires a single query source with a link traversal manager to be present in the context.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionQuerySourceIdentify): Promise<IActorQuerySourceIdentifyOutput> {
    const querySourceContext = action.querySourceUnidentified.context ?? new ActionContext();
    const linkTraversalManager = querySourceContext.getSafe(KeysQuerySourceIdentify.linkTraversalManager);
    return {
      querySource: {
        source: new QuerySourceLinkTraversal(linkTraversalManager),
        context: querySourceContext,
      },
    };
  }
}
