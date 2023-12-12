import type { IBindingsContextMergeHandler } from '@comunica/bus-merge-binding-factory';

export class SetUnionContext implements IBindingsContextMergeHandler<any> {
  public name: string;

  public constructor() {
    this.name = 'SetUnion';
  }

  public run(...inputSets: any[][]): any[] {
    return [ ...new Set<string>(inputSets.flat()) ];
  }
}
