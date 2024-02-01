import type { IBindingsContextMergeHandler } from '@comunica/bus-merge-bindings-context';

export class SetUnionBindingsContextMergeHandler implements IBindingsContextMergeHandler<any> {
  public run(...inputSets: any[][]): any[] {
    return [ ...new Set<string>(inputSets.flat()) ];
  }
}
