import type { MediatorHttp } from '@comunica/bus-http';
import { validateAndCloseHttpResponse, ActorHttp } from '@comunica/bus-http';
import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
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

  public async update(
    quadStreams: { insert?: AsyncIterator<RDF.Quad>; delete?: AsyncIterator<RDF.Quad> },
  ): Promise<void> {
    // Create combined query stream with quads to insert and delete
    const queryStream = this.createCombinedQuadsQuery(quadStreams.insert, quadStreams.delete);
    await this.wrapSparqlUpdateRequest(queryStream);
  }

  private createCombinedQuadsQuery(
    quadsToInsert?: AsyncIterator<RDF.Quad>,
    quadsToDelete?: AsyncIterator<RDF.Quad>,
  ): AsyncIterator<string> {
    return new ArrayIterator<string>([], { autoStart: false })
      .append(this.createQuadsQuery('DELETE', quadsToDelete))
      .append(quadsToDelete && quadsToInsert ? [ ' ;\n' ] : [])
      .append(this.createQuadsQuery('INSERT', quadsToInsert));
  }

  private createQuadsQuery(type: 'INSERT' | 'DELETE', quads?: AsyncIterator<RDF.Quad>): AsyncIterator<string> {
    if (!quads) {
      return new ArrayIterator<string>([], { autoStart: false });
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

  private async wrapSparqlUpdateRequest(queryStream: AsyncIterator<string>): Promise<void> {
    const readable = new Readable();
    readable.wrap(<any> queryStream);

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

    await validateAndCloseHttpResponse(this.url, httpResponse);
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
