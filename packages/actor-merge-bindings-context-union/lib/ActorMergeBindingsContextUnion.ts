import type {
  IActionMergeBindingsContext,
  IActorMergeBindingsContextOutput,
  IActorMergeBindingsContextArgs,
  IBindingsContextMergeHandler,
} from '@comunica/bus-merge-bindings-context';
import { ActorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorTest } from '@comunica/core';
import { SetUnionBindingsContextMergeHandler } from './SetUnionBindingsContextMergeHandler';

/**
 * A comunica Union Merge Bindings Context Actor.
 */
export class ActorMergeBindingsContextUnion extends ActorMergeBindingsContext {
  private readonly contextKey: string;
  public constructor(args: IActorMergeBindingsContextUnionArgs) {
    super(args);
    this.contextKey = args.contextKey;
  }

  public async test(_action: IActionMergeBindingsContext): Promise<IActorTest> {
    return true;
  }

  public async run(_action: IActionMergeBindingsContext): Promise<IActorMergeBindingsContextOutput> {
    // Merge function: Union with set semantics
    const mergeHandlers: Record<string, IBindingsContextMergeHandler<any>> = {};
    mergeHandlers[this.contextKey] = new SetUnionBindingsContextMergeHandler();

    return { mergeHandlers };
  }
}

export interface IActorMergeBindingsContextUnionArgs extends IActorMergeBindingsContextArgs {
  /**
   * The context key name to merge over.
   */
  contextKey: string;
}
