import { PassThrough } from 'stream';
import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type {
  IActionRootRdfSerialize,
  IActorTestRootRdfSerialize,
  IActorOutputRootRdfSerialize,
} from '@comunica/bus-rdf-serialize';
import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type { Actor, IActorTest, Mediator } from '@comunica/core';
import type { ActionContext } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import { SparqlEndpointFetcher } from 'fetch-sparql-endpoint';
import type * as RDF from 'rdf-js';

const stringifyStream = require('stream-to-string');

/**
 * A quad destination that represents an LDP resource.
 */
export class QuadDestinationSparql implements IQuadDestination {
  private readonly url: string;
  private readonly context: ActionContext | undefined;

  private readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  private readonly mediatorRdfSerialize: Mediator<
  Actor<IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>,
  IActionRootRdfSerialize, IActorTestRootRdfSerialize, IActorOutputRootRdfSerialize>;

  private readonly endpointFetcher: SparqlEndpointFetcher;

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
    this.endpointFetcher = new SparqlEndpointFetcher({
      fetch: (input: Request | string, init?: RequestInit) => this.mediatorHttp.mediate(
        { input, init, context: this.context },
      ),
      prefixVariableQuestionMark: true,
    });
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

    // Serialize query stream to string
    const query = await stringifyStream(dataWrapped);

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
