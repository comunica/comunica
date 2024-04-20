import type { MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import { validateHttpResponse } from '@comunica/bus-rdf-update-quads';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { EmptyIterator } from 'asynciterator';
import { Headers } from 'cross-fetch';
import { termToString } from 'rdf-string-ttl';
import { Readable } from 'readable-stream';

/**
 * A quad destination that represents a resource that is patchable via SPARQL Update.
 */
export class QuadDestinationPatchSparqlUpdate implements IQuadDestination {
  private readonly url: string;
  private readonly context: IActionContext;

  private readonly mediatorHttp: MediatorHttp;

  public constructor(
    url: string,
    context: IActionContext,
    mediatorHttp: MediatorHttp,
  ) {
    this.url = url;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
  }

  public insert(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.wrapSparqlUpdateRequest(quads);
  }

  public delete(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.wrapSparqlUpdateRequest(undefined, quads);
  }

  public update(quadsToInsert: AsyncIterator<RDF.Quad>, quadsToDelete: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.wrapSparqlUpdateRequest(quadsToInsert, quadsToDelete);
  }

  private async wrapSparqlUpdateRequest(
    quadsToInsert?: AsyncIterator<RDF.Quad>,
    quadsToDelete?: AsyncIterator<RDF.Quad>,
  ): Promise<void> {
    // Create combined query stream with quads to insert and delete
    const queryStream = this.createCombinedQuadsQuery(quadsToInsert, quadsToDelete);

    const readable = new Readable();
    readable._read = () => true;
    queryStream.on('data', (chunk: string) => readable.push(chunk));
    queryStream.on('end', () => readable.push(null));

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

    await validateHttpResponse(this.url, httpResponse);
  }

  private createCombinedQuadsQuery(
    quadsToInsert?: AsyncIterator<RDF.Quad>,
    quadsToDelete?: AsyncIterator<RDF.Quad>,
  ): AsyncIterator<string> {
    return new EmptyIterator<string>()
      .append(this.createQuadsQuery('DELETE', quadsToDelete))
      .append(quadsToDelete && quadsToInsert ? [ ' ;\n' ] : [])
      .append(this.createQuadsQuery('INSERT', quadsToInsert));
  }

  private createQuadsQuery(type: 'INSERT' | 'DELETE', quads?: AsyncIterator<RDF.Quad>): AsyncIterator<string> {
    if (!quads) {
      return new EmptyIterator();
    }
    // Wrap triples in DATA block
    return quads
      .map((quad: RDF.Quad) => {
        let stringQuad = `${termToString(quad.subject)} ${termToString(quad.predicate)} ${termToString(quad.object)} .`;
        if (quad.graph.termType === 'DefaultGraph') {
          stringQuad = `  ${stringQuad}\n`;
        } else {
          stringQuad = `  GRAPH ${termToString(quad.graph)} { ${stringQuad} }\n`;
        }
        return stringQuad;
      })
      .prepend([ `${type} DATA {\n` ])
      .append([ '}' ]);
  }

  public async deleteGraphs(
    _graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[],
    _requireExistence: boolean,
    _dropGraphs: boolean,
  ): Promise<void> {
    throw new Error(`Patch-based SPARQL Update destinations don't support named graphs`);
  }

  public async createGraphs(_graphs: RDF.NamedNode[], _requireNonExistence: boolean): Promise<void> {
    throw new Error(`Patch-based SPARQL Update destinations don't support named graphs`);
  }
}
