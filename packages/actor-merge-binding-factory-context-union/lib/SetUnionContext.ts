import { IMergeHandler } from "@comunica/bus-merge-binding-factory";

export class SetUnionContext implements IMergeHandler<any> {
    public constructor(){

    }
    
    public run(...inputSets: any[][]): any[]{
      return [...new Set<string>(inputSets.flat())];
    }
  }
