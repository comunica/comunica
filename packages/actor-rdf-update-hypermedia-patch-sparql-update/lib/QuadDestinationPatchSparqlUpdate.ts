import { Readable } from 'stream';
import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import type { ActionContext } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import { Headers } from 'cross-fetch';
import type * as RDF from 'rdf-js';
import { termToString } from 'rdf-string-ttl';

/**
 * A quad destination that represents a resource that is patchable via SPARQL Update.
 */
export class QuadDestinationPatchSparqlUpdate implements IQuadDestination {
  private readonly url: string;
  private readonly context: ActionContext | undefined;

  private readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public constructor(
    url: string,
    context: ActionContext | undefined,
    mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>,
  ) {
    this.url = url;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
  }

  public insert(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.wrapSparqlUpdateRequest('INSERT', quads);
  }

  public async delete(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.wrapSparqlUpdateRequest('DELETE', quads);
  }

  public async wrapSparqlUpdateRequest(type: 'INSERT' | 'DELETE', quads: AsyncIterator<RDF.Quad>): Promise<void> {
    // Wrap triples in DATA block
    const dataWrapped = quads
      .map((quad: RDF.Quad) => {
        let stringQuad = `${termToString(quad.subject)} ${termToString(quad.predicate)} ${termToString(quad.object)} .`;
        if (quad.graph.termType !== 'DefaultGraph') {
          stringQuad = `  GRAPH ${termToString(quad.graph)} { ${stringQuad} }\n`;
        } else {
          stringQuad = `  ${stringQuad}\n`;
        }
        return stringQuad;
      })
      .prepend([ `${type} DATA {\n` ])
      .append([ '}' ]);
    const readable = new Readable();
    readable._read = () => true;
    dataWrapped.on('data', (quad: RDF.Quad) => readable.push(quad));
    dataWrapped.on('end', () => readable.push(null));

    // Send data in PUT request
    const headers: Headers = new Headers({ 'content-type': 'application/sparql-update' });
    const httpResponse = await this.mediatorHttp.mediate({
      context: this.context,
      init: {
        headers,
        method: 'PATCH',
        body: ActorHttp.toWebReadableStream(readable),
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
    graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[],
    requireExistence: boolean,
    dropGraphs: boolean,
  ): Promise<void> {
    throw new Error(`Patch-based SPARQL Update destinations don't support named graphs`);
  }

  public async createGraphs(graphs: RDF.NamedNode[], requireNonExistence: boolean): Promise<void> {
    throw new Error(`Patch-based SPARQL Update destinations don't support named graphs`);
  }
}
