import type { IActionMergeBindingsContext,
  IActorMergeBindingsContextOutput, IActorMergeBindingsContextArgs,
  IBindingsContextMergeHandler } from '@comunica/bus-merge-bindings-context';
import { ActorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorTest } from '@comunica/core';
import { SetUnionContext } from './SetUnionContext';

/**
 * A comunica Union Merge Bindings Context Actor.
 */
export class ActorMergeBindingsContextUnion extends ActorMergeBindingsContext {
  private readonly contextKey: string;
  public constructor(args: IActorMergeBindingsContextUnionArgs) {
    super(args);
    this.contextKey = args.contextKey;
  }

  public async test(action: IActionMergeBindingsContext): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionMergeBindingsContext): Promise<IActorMergeBindingsContextOutput> {
    // Merge function: Union with set semantics
    const mergeHandlers: Record<string, IBindingsContextMergeHandler<any>> = {};
    mergeHandlers[this.contextKey] = new SetUnionContext();

    return { mergeHandlers };
  }
}

export interface IActorMergeBindingsContextUnionArgs extends IActorMergeBindingsContextArgs{
  /**
   * The keys the mergehandler created by this actor should merge over. With the key of the record being the key name
   * and the value the expected type of the context entry
   */
  contextKey: string;
}

