import type { IActionProcessIterator, IActorProcessIteratorArgs } from '@comunica/bus-process-iterator';
import { ActorProcessIterator } from '@comunica/bus-process-iterator';
import type { IActorTest } from '@comunica/core';
import type { Bindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Count Intermediate Results Process Iterator Actor.
 */
export class ActorProcessIteratorCountIntermediateResults extends ActorProcessIterator<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>> {
  // TEMP NEEDS TO BE MERGED WITH STATS TRACKING
  public intermediateResults: IPartialResult[];

  public constructor(args: IActorProcessIteratorArgs) {
    super(args);
    this.intermediateResults = [];
  }

  public async test(_action: IActionProcessIterator<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>): Promise<IActorTest> {
    return true;
  }

  public processStream<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>(stream: T, metadata?: Record<string, any>): T {
    const output = <T> stream.map((data) => {
      this.intermediateResults.push({ data, metadata: { time: Date.now() }});
      return data;
    });
    return output;
  }
}

export interface IPartialResult {
  data: Bindings | RDF.Quad;
  metadata: Record<string, any>;

}
