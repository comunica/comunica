import type { MediatorHttp } from '@comunica/bus-http';
import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import { termToString } from 'rdf-string-ttl';

/**
 * A quad destination that represents an LDP resource.
 */
export class QuadDestinationSparql implements IQuadDestination {
  private readonly url: string;
  private readonly context: IActionContext;

  private readonly mediatorHttp: MediatorHttp;

  private readonly endpointFetcher: SparqlEndpointFetcher;

  public constructor(
    url: string,
    context: IActionContext,
    mediatorHttp: MediatorHttp,
    dataFactory: ComunicaDataFactory,
  ) {
    this.url = url;
    this.context = context;
    this.mediatorHttp = mediatorHttp;
    this.endpointFetcher = new SparqlEndpointFetcher({
      fetch: (input: Request | string, init?: RequestInit) => this.mediatorHttp.mediate(
        { input, init, context: this.context },
      ),
      prefixVariableQuestionMark: true,
      dataFactory,
    });
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
    // Serialize query stream to string
    const query = await stringifyStream(queryStream);

    // Send update query to endpoint
    await this.endpointFetcher.fetchUpdate(this.url, query);
  }

  public async deleteGraphs(
    graphsIn: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[],
    requireExistence: boolean,
    dropGraphs: boolean,
  ): Promise<void> {
    const graphs: (RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode)[] = Array.isArray(graphsIn) ?
      graphsIn :
        [ graphsIn ];
    const queries: string[] = [];
    for (const graph of graphs) {
      let graphValue: string;
      if (typeof graph === 'string') {
        graphValue = graph;
      } else if (graph.termType === 'DefaultGraph') {
        graphValue = 'DEFAULT';
      } else {
        graphValue = `GRAPH <${graph.value}>`;
      }
      queries.push(`${dropGraphs ? 'DROP' : 'CLEAR'} ${requireExistence ? '' : 'SILENT '}${graphValue}`);
    }
    await this.endpointFetcher.fetchUpdate(this.url, queries.join('; '));
  }

  public async createGraphs(graphs: RDF.NamedNode[], requireNonExistence: boolean): Promise<void> {
    const queries: string[] = [];
    for (const graph of graphs) {
      queries.push(`CREATE${requireNonExistence ? '' : ' SILENT'} GRAPH <${graph.value}>`);
    }
    await this.endpointFetcher.fetchUpdate(this.url, queries.join('; '));
  }
}
