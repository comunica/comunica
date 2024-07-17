import { ActorProcessIterator, IActionProcessIterator, IActorProcessIteratorOutput, IActorProcessIteratorArgs } from '@comunica/bus-process-iterator';
import { IActorTest } from '@comunica/core';
import { Bindings } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Count Intermediate Results Process Iterator Actor.
 */
export class ActorProcessIteratorCountIntermediateResults extends ActorProcessIterator {
  // TEMP NEEDS TO BE MERGED WITH STATS TRACKING
  public intermediateResults: IPartialResult[];

  public constructor(args: IActorProcessIteratorArgs) {  
    super(args);
    this.intermediateResults = [];
  }

  public async test(_action: IActionProcessIterator): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionProcessIterator): Promise<IActorProcessIteratorOutput>{
    switch (action.type) {
      case 'binding':
        action.stream = this.processBindingsIterator(action.stream);
        break;
      case 'quad':
        action.stream = this.processQuadsIterator(action.stream);
        break;
    }
    return action;
  }

  public processBindingsIterator(bindingsStream: AsyncIterator<RDF.Bindings>): AsyncIterator<RDF.Bindings>{
    return bindingsStream.map((binding: Bindings) => {
      this.intermediateResults.push({data: binding, metadata: {time: Date.now()}});
      console.log(this.intermediateResults.length);
      console.log(Array.from(binding.values()));
      return binding;
    });
  }

  public processQuadsIterator(quadsStream: AsyncIterator<RDF.Quad>): AsyncIterator<RDF.Quad>{
    return quadsStream.map((quad: RDF.Quad) => {
      this.intermediateResults.push({data: quad, metadata: {time: Date.now()}});
      return quad;
    })
  }
}

export interface IPartialResult{
  data: Bindings | RDF.Quad;
  metadata: Record<string, any>;

}
