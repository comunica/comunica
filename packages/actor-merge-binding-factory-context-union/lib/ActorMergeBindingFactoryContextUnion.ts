import type { IActionMergeBindingFactory,
  IActorMergeBindingFactoryOutput, IActorMergeBindingFactoryArgs,
  IMergeHandler } from '@comunica/bus-merge-binding-factory';
import { ActorMergeBindingFactory } from '@comunica/bus-merge-binding-factory';
import type { IActorTest } from '@comunica/core';
import { SetUnionContext } from './SetUnionContext';

/**
 * A comunica Context Union Merge Binding Factory Actor.
 */
export class ActorMergeBindingFactoryContextUnion extends ActorMergeBindingFactory {
  private readonly contextKey: string;
  public constructor(args: IActorMergeBindingFactoryContextUnionArgs) {
    super(args);
    this.contextKey = args.contextKey;
  }

  public async test(action: IActionMergeBindingFactory): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionMergeBindingFactory): Promise<IActorMergeBindingFactoryOutput> {
    // Merge function: Union with set semantics
    const mergeHandlers: Record<string, IMergeHandler<any>> = {};
    mergeHandlers[this.contextKey] = new SetUnionContext();

    return { mergeHandlers };
  }
}

export interface IActorMergeBindingFactoryContextUnionArgs extends IActorMergeBindingFactoryArgs{
  /**
   * The keys the mergehandler created by this actor should merge over. With the key of the record being the key name
   * and the value the expected type of the context entry
   */
  contextKey: string;
}

