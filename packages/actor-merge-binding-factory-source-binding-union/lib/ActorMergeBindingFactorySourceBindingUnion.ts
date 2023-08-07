import { ActorMergeBindingFactory, IActionMergeBindingFactory, IActorMergeBindingFactoryOutput, IActorMergeBindingFactoryArgs } from '@comunica/bus-merge-binding-factory';
import { KeysBindingContext } from '@comunica/context-entries';
import { ActionContextKey, IActorTest } from '@comunica/core';

/**
 * A comunica Source Binding Union Merge Binding Factory Actor.
 */
export class ActorMergeBindingFactorySourceBindingUnion extends ActorMergeBindingFactory {
  public constructor(args: IActorMergeBindingFactoryArgs) {
    super(args);
  }

  public async test(action: IActionMergeBindingFactory): Promise<IActorTest> {
    return true; // TODO implement
  }

  public async run(action: IActionMergeBindingFactory): Promise<IActorMergeBindingFactoryOutput> {
    const mergeHandlers: Record<string, Function> = {};

    console.log("Running!")
    // Merge of source bindings function: Union with set semantics
    const mergeSourceBindings = function(...sources: string[]){
      return Array.from(new Set<string>(sources));
    }
    mergeHandlers.sourceBinding = mergeSourceBindings
    return {mergeHandlers: mergeHandlers}; // TODO implement
  }
}
