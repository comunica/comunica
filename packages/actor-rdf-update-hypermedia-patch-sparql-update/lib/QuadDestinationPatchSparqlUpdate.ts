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
    // The quads to delete are collected before the request is started, so that quads that can not be deleted
    // are reported as an error, instead of resulting in a partially written request body.
    const quadsToDelete = quadStreams.delete && await quadStreams.delete.toArray();
    if (quadsToDelete) {
      for (const quad of quadsToDelete) {
        // SPARQL does not allow blank nodes inside DELETE DATA blocks, as a blank node label can not be used
        // to refer to a blank node in the destination.
        // Replacing them by variables in a DELETE ... WHERE ... operation is not a valid alternative,
        // as such a pattern also matches other blank nodes and terms,
        // by which more would be deleted than was asked for.
        if (QuadDestinationPatchSparqlUpdate.hasBlankNode(quad)) {
          throw new Error(`Unable to delete '${QuadDestinationPatchSparqlUpdate.tripleToString(quad)}' via a SPARQL Update patch, as blank nodes can not be referred to by label. Consider replacing the contents of the destination instead.`);
        }
      }
    }

    // Create combined query stream with quads to insert and delete
    const queryStream = this.createCombinedQuadsQuery(
      quadStreams.insert,
      quadsToDelete && new ArrayIterator<RDF.Quad>(quadsToDelete, { autoStart: false }),
    );
    await this.wrapSparqlUpdateRequest(queryStream);
  }

  /**
   * Check if the given term is a blank node, or contains one inside a quoted triple.
   */
  private static hasBlankNode(term: RDF.Term): boolean {
    if (term.termType === 'BlankNode') {
      return true;
    }
    if (term.termType === 'Quad') {
      return QuadDestinationPatchSparqlUpdate.hasBlankNode(term.subject) ||
        QuadDestinationPatchSparqlUpdate.hasBlankNode(term.predicate) ||
        QuadDestinationPatchSparqlUpdate.hasBlankNode(term.object) ||
        QuadDestinationPatchSparqlUpdate.hasBlankNode(term.graph);
    }
    return false;
  }

  private static tripleToString(quad: RDF.Quad): string {
    return `${termToString(quad.subject)} ${termToString(quad.predicate)} ${termToString(quad.object)} .`;
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
        let stringQuad = QuadDestinationPatchSparqlUpdate.tripleToString(quad);
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
