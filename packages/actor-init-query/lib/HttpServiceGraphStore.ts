/* eslint-disable import/no-nodejs-modules */
import { randomUUID } from 'node:crypto';
import type * as http from 'node:http';
import type * as url from 'node:url';
import type { QueryQuads } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { QueryEngineBase } from '..';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

/**
 * The content types through which the SPARQL protocol, rather than the Graph Store protocol, is invoked.
 */
const SPARQL_PROTOCOL_TYPES = [
  'application/sparql-query',
  'application/sparql-update',
  'application/x-www-form-urlencoded',
];

const BOUNDARY_REGEX = /;\s*boundary=(?:"([^"]*)"|([^\s;]+))/iu;

const CONTENT_TYPE_REGEX = /^content-type\s*:(.*)$/iu;

/**
 * The RDF graph that a Graph Store HTTP Protocol request applies to.
 */
export interface IGraphStoreTarget {
  /**
   * The graph the request applies to, or undefined if it applies to the graph store itself.
   */
  graph?: RDF.NamedNode | RDF.DefaultGraph;
  /**
   * The reason why the request does not address a valid Graph Store HTTP Protocol resource.
   */
  error?: string;
}

/**
 * The outcome of a Graph Store HTTP Protocol request.
 */
export interface IGraphStoreResult {
  status: number;
  /**
   * Additional response headers, such as the Location of a newly created graph.
   */
  headers?: Record<string, string>;
  /**
   * The contents of the graph, for requests that retrieve one.
   */
  result?: QueryQuads;
  /**
   * A human-readable message, for responses without a graph.
   */
  message?: string;
}

/**
 * An implementation of the SPARQL 1.1 Graph Store HTTP Protocol,
 * which is exposed on the same path as the SPARQL protocol.
 *
 * Graphs are identified directly through the request path, such as `/sparql/person/1.ttl`,
 * and indirectly through the `graph` and `default` parameters on the endpoint itself.
 */
export class HttpServiceGraphStore {
  public readonly context: any;

  public constructor(context: any) {
    this.context = context;
  }

  /**
   * Determine the graph that a request applies to, if it is a Graph Store HTTP Protocol request.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {module:url.UrlWithParsedQuery} requestUrl The parsed request URL.
   * @param {string} endpointIri The IRI of this endpoint.
   * @return {IGraphStoreTarget | undefined} The graph, or undefined if this is not a graph store request.
   */
  public static getTarget(
    request: http.IncomingMessage,
    requestUrl: url.UrlWithParsedQuery,
    endpointIri: string,
  ): IGraphStoreTarget | undefined {
    const endpointPath = new URL(endpointIri).pathname;
    const pathname = requestUrl.pathname ?? '';

    // Direct graph identification: the request IRI itself identifies the graph
    if (pathname.startsWith(`${endpointPath}/`)) {
      return { graph: DF.namedNode(endpointIri + pathname.slice(endpointPath.length)) };
    }
    if (pathname !== endpointPath) {
      return;
    }

    // The endpoint IRI is shared with the SPARQL protocol, whose requests are never graph store requests,
    // not even when they carry a graph parameter. A GET without any of these returns the service description.
    const contentType = request.headers['content-type'];
    if (requestUrl.query.query !== undefined || requestUrl.query.update !== undefined ||
      (contentType !== undefined && !HttpServiceGraphStore.isGraphPayload(contentType))) {
      return;
    }

    // Indirect graph identification: a parameter on the endpoint identifies the graph
    const graph = requestUrl.query.graph;
    if (Array.isArray(graph)) {
      return { error: 'A request can only contain a single graph parameter' };
    }
    if (graph !== undefined) {
      return { graph: DF.namedNode(graph) };
    }
    if (requestUrl.query.default !== undefined) {
      return { graph: DF.defaultGraph() };
    }

    // Without graph identification, only requests that the SPARQL protocol does not define apply to the graph store
    if (request.method === 'PUT' || request.method === 'DELETE') {
      return { error: 'A request must identify a graph through its path, a graph parameter or a default parameter' };
    }
    if (request.method === 'POST' && contentType !== undefined) {
      return {};
    }
  }

  /**
   * Determine if a request body contains an RDF graph, rather than a request of the SPARQL protocol.
   * @param {string} contentType The content type of the request body.
   */
  public static isGraphPayload(contentType: string): boolean {
    return !SPARQL_PROTOCOL_TYPES.some(type => contentType.includes(type));
  }

  /**
   * Determine the media type of a content type header value, without any of its parameters.
   * @param {string} contentType A content type header value.
   */
  public static getMediaType(contentType: string): string {
    return contentType.split(';')[0].trim();
  }

  /**
   * Split a multipart/form-data payload into the RDF payloads it consists of.
   * @param {string} body The multipart payload.
   * @param {string} contentType The content type of the payload, which declares the boundary.
   * @return The content type and body of each part.
   */
  public static splitMultipart(body: string, contentType: string): { contentType: string; body: string }[] {
    const boundary = BOUNDARY_REGEX.exec(contentType);
    if (!boundary) {
      throw new Error('A multipart/form-data request must declare a boundary');
    }

    // The parts are delimited by the boundary, preceded by a preamble and followed by an epilogue
    return body.split(`--${boundary[1] ?? boundary[2]}`).slice(1, -1).map((part) => {
      const separator = part.indexOf('\r\n\r\n');
      if (separator < 0) {
        throw new Error('A part of a multipart/form-data request is missing a header section');
      }
      const partType = part.slice(0, separator)
        .split('\r\n')
        .map(header => CONTENT_TYPE_REGEX.exec(header))
        .find(Boolean);
      if (!partType) {
        throw new Error('A part of a multipart/form-data request is missing a content type');
      }
      return { contentType: partType[1].trim(), body: part.slice(separator + 4).replace(/\r\n$/u, '') };
    });
  }

  /**
   * Handle a Graph Store HTTP Protocol request.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {IGraphStoreTarget} target The graph the request applies to.
   * @param {string} endpointIri The IRI of this endpoint.
   * @param {() => Promise<string>} readBody A callback that reads the request body.
   * @return {Promise<IGraphStoreResult>} The outcome of the request.
   */
  public async handleRequest(
    engine: QueryEngineBase,
    request: http.IncomingMessage,
    target: IGraphStoreTarget,
    endpointIri: string,
    readBody: () => Promise<string>,
  ): Promise<IGraphStoreResult> {
    if (target.error) {
      return { status: 400, message: target.error };
    }

    try {
      switch (request.method) {
        case 'GET':
        case 'HEAD':
          return await this.readGraph(engine, target.graph!);
        case 'DELETE':
          return await this.deleteGraph(engine, target.graph!);
        case 'PUT':
          return await this.writeGraph(engine, target.graph, true, await readBody(), request, endpointIri);
        case 'POST':
          return await this.writeGraph(engine, target.graph, false, await readBody(), request, endpointIri);
        default:
          return { status: 405, message: 'Incorrect HTTP method' };
      }
    } catch (error: unknown) {
      return { status: 400, message: (<Error> error).message };
    }
  }

  /**
   * Retrieve the contents of a graph.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {RDF.NamedNode | RDF.DefaultGraph} graph The graph to retrieve.
   */
  public async readGraph(
    engine: QueryEngineBase,
    graph: RDF.NamedNode | RDF.DefaultGraph,
  ): Promise<IGraphStoreResult> {
    if (!await this.graphExists(engine, graph)) {
      return { status: 404, message: `The graph ${graph.value} does not exist.` };
    }
    const result = <QueryQuads> await engine.query(HttpServiceGraphStore.constructGraph(graph), this.context);
    return { status: 200, result };
  }

  /**
   * Delete a graph, together with all of its contents.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {RDF.NamedNode | RDF.DefaultGraph} graph The graph to delete.
   */
  public async deleteGraph(
    engine: QueryEngineBase,
    graph: RDF.NamedNode | RDF.DefaultGraph,
  ): Promise<IGraphStoreResult> {
    if (!await this.graphExists(engine, graph)) {
      return { status: 404, message: `The graph ${graph.value} does not exist.` };
    }
    await engine.queryVoid(HttpServiceGraphStore.dropGraph(graph), this.context);
    return { status: 204 };
  }

  /**
   * Store the RDF payload of a request in a graph.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {RDF.NamedNode | RDF.DefaultGraph | undefined} graph The graph to store the payload in,
   *                                                            or undefined to create a new graph for it.
   * @param {boolean} replace If the previous contents of the graph must be replaced instead of merged with.
   * @param {string} body The request body.
   * @param {module:http.IncomingMessage} request Request object.
   * @param {string} endpointIri The IRI of this endpoint.
   */
  public async writeGraph(
    engine: QueryEngineBase,
    graph: RDF.NamedNode | RDF.DefaultGraph | undefined,
    replace: boolean,
    body: string,
    request: http.IncomingMessage,
    endpointIri: string,
  ): Promise<IGraphStoreResult> {
    const created = graph ?? DF.namedNode(`${endpointIri}/${randomUUID()}`);
    const contentType = request.headers['content-type'];
    if (!contentType) {
      throw new Error('A request with an RDF payload must declare its content type');
    }

    const quads = await this
      .parsePayload(engine, body, contentType, new URL(request.url ?? '', endpointIri).href);
    const exists = graph !== undefined && await this.graphExists(engine, created);

    const updates: Algebra.Operation[] = [];
    if (replace) {
      updates.push(HttpServiceGraphStore.dropGraph(created));
    }
    if (quads.length > 0) {
      updates.push(AF.createDeleteInsert(undefined, quads
        .map(quad => AF.createPattern(quad.subject, quad.predicate, quad.object, created))));
    }
    if (updates.length > 0) {
      await engine.queryVoid(AF.createCompositeUpdate(updates), this.context);
    }

    if (graph && exists) {
      return { status: 204 };
    }
    return { status: 201, headers: graph ? {} : { Location: created.value }};
  }

  /**
   * Parse the RDF payload of a request, which may consist of multiple parts.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {string} body The request body.
   * @param {string} contentType The content type of the request body.
   * @param {string} baseIRI The base IRI that relative IRIs in the payload are resolved against.
   */
  public async parsePayload(
    engine: QueryEngineBase,
    body: string,
    contentType: string,
    baseIRI: string,
  ): Promise<RDF.Quad[]> {
    const parts = contentType.includes('multipart/form-data') ?
      HttpServiceGraphStore.splitMultipart(body, contentType) :
        [{ body, contentType }];

    const quads: RDF.Quad[] = [];
    for (const part of parts) {
      const result = <QueryQuads> await engine.query(
        HttpServiceGraphStore.constructGraph(DF.defaultGraph()),
        {
          sources: [{
            type: 'serialized',
            value: part.body,
            mediaType: HttpServiceGraphStore.getMediaType(part.contentType),
            baseIRI,
          }],
        },
      );
      quads.push(...await (<AsyncIterator<RDF.Quad>> await result.execute()).toArray());
    }
    return quads;
  }

  /**
   * Determine if a graph is present in the graph store. The default graph is always present.
   * @param {QueryEngineBase} engine A SPARQL engine.
   * @param {RDF.NamedNode | RDF.DefaultGraph} graph The graph to look for.
   */
  public async graphExists(engine: QueryEngineBase, graph: RDF.NamedNode | RDF.DefaultGraph): Promise<boolean> {
    if (graph.termType === 'DefaultGraph') {
      return true;
    }
    return await engine.queryBoolean(
      AF.createAsk(AF.createBgp([ HttpServiceGraphStore.createGraphPattern(graph) ])),
      this.context,
    );
  }

  /**
   * Create a query that retrieves the contents of a graph as a single RDF graph.
   * @param {RDF.NamedNode | RDF.DefaultGraph} graph The graph to retrieve.
   */
  public static constructGraph(graph: RDF.NamedNode | RDF.DefaultGraph): Algebra.Operation {
    return AF.createConstruct(
      AF.createBgp([ HttpServiceGraphStore.createGraphPattern(graph) ]),
      [ AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) ],
    );
  }

  /**
   * Create an update that removes a graph, together with all of its contents.
   * @param {RDF.NamedNode | RDF.DefaultGraph} graph The graph to remove.
   */
  public static dropGraph(graph: RDF.NamedNode | RDF.DefaultGraph): Algebra.Operation {
    return AF.createDrop(graph.termType === 'DefaultGraph' ? 'DEFAULT' : graph, true);
  }

  /**
   * Create a pattern that matches all triples of a graph.
   * @param {RDF.NamedNode | RDF.DefaultGraph} graph The graph to match.
   */
  public static createGraphPattern(graph: RDF.NamedNode | RDF.DefaultGraph): Algebra.Pattern {
    return AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), graph);
  }
}
/* eslint-enable import/no-nodejs-modules */
