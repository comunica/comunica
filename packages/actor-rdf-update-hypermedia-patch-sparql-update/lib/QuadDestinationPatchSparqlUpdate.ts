import { PassThrough } from 'stream';
import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type {
  IActionRootRdfSerialize,
  IActorTestRootRdfSerialize,
  IActorOutputRootRdfSerialize,
} from '@comunica/bus-rdf-serialize';
import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import type { ActionContext } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import { Headers } from 'cross-fetch';
import type * as RDF from 'rdf-js';

/**
 * A quad destination that represents an LDP resource.
 */
export class QuadDestinationPatchSparqlUpdate implements IQuadDestination {
  private readonly url: string;
  private readonly context: ActionContext | undefined;

  private readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  private readonly mediatorRdfSerialize: Mediator<
  Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
  IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;

  public constructor(
    url: string,
    context: ActionContext | undefined,
    mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>,
    mediatorRdfSerialize: Mediator<
    Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
    IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
  ) {
    this.url = url;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
    this.mediatorRdfSerialize = mediatorRdfSerialize;
  }

  public insert(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.wrapSparqlUpdateRequest('INSERT', quads);
  }

  public async delete(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.wrapSparqlUpdateRequest('DELETE', quads);
  }

  public async wrapSparqlUpdateRequest(type: 'INSERT' | 'DELETE', quads: AsyncIterator<RDF.Quad>): Promise<void> {
    // Serialize quads
    const { handle: { data }} = await this.mediatorRdfSerialize.mediate({
      handle: { quadStream: quads },
      handleMediaType: 'text/turtle',
    });

    // Wrap triples in INSERT DATA block
    const dataWrapped = new PassThrough();
    dataWrapped.push(`${type} DATA {`);
    data.pipe(dataWrapped, { end: false });
    data.on('end', () => {
      dataWrapped.push('}');
      dataWrapped.push(null);
    });

    // Send data in PUT request
    const headers: Headers = new Headers({ 'content-type': 'application/sparql-update' });
    const httpResponse = await this.mediatorHttp.mediate({
      context: this.context,
      init: {
        headers,
        method: 'PATCH',
        body: ActorHttp.toWebReadableStream(dataWrapped),
      },
      input: this.url,
    });

    // Check if update was successful
    if (httpResponse.status >= 400) {
      throw new Error(`Could not retrieve ${this.url} (${httpResponse.status}: ${
        httpResponse.statusText || 'unknown error'})`);
    }

    // Close response body, as we don't need it
    await httpResponse.body?.cancel();
  }

  public async deleteGraphs(
    graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode,
    requireExistence: boolean,
    dropGraphs: boolean,
  ): Promise<void> {
    throw new Error(`Patch-based SPARQL Update destinations don't support named graphs`);
  }

  public async createGraph(graph: RDF.NamedNode, requireNonExistence: boolean): Promise<void> {
    throw new Error(`Patch-based SPARQL Update destinations don't support named graphs`);
  }
}
