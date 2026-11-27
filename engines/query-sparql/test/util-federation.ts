import type * as RDF from '@rdfjs/types';
import { Parser } from 'n3';
import { RdfStore } from 'rdf-stores';
import { QueryEngine } from '../lib/QueryEngine';

/**
 * A request that was sent to one of the endpoints of a {@link MockFederation}.
 */
export interface IMockFederationRequest {
  endpoint: string;
  method: string;
  /**
   * The SPARQL query, or undefined for service description requests.
   */
  query?: string;
}

/**
 * Determines the response to a request instead of evaluating it,
 * or returns undefined to evaluate the request as usual.
 */
export type MockFederationInterceptor = (request: IMockFederationRequest, index: number) =>
  Response | undefined | Promise<Response | undefined>;

/**
 * A federation of SPARQL endpoints for system tests, served through the `fetch` context option.
 * Each endpoint evaluates queries over its own in-memory dataset, with a separate query engine,
 * and all requests are recorded, so tests can check both results and how they were obtained.
 */
export class MockFederation {
  public readonly requests: IMockFederationRequest[] = [];
  private readonly engine = new QueryEngine();
  private readonly stores = new Map<string, RdfStore>();
  private pending = 0;

  /**
   * @param datasets Turtle data per endpoint URL.
   * @param interceptor An optional function to answer requests differently, such as with errors.
   */
  public constructor(
    datasets: Record<string, string>,
    private readonly interceptor?: MockFederationInterceptor,
  ) {
    for (const [ endpoint, turtle ] of Object.entries(datasets)) {
      const store = RdfStore.createDefault();
      for (const quad of new Parser().parse(turtle)) {
        store.addQuad(quad);
      }
      this.stores.set(endpoint, store);
    }
  }

  /**
   * The sources to pass to the engine: all endpoints, as SPARQL endpoints.
   */
  public get sources(): { type: 'sparql'; value: string }[] {
    return [ ...this.stores.keys() ].map(value => ({ type: 'sparql', value }));
  }

  /**
   * The requests that contained a query, per endpoint.
   */
  public queriesTo(endpoint: string): string[] {
    return this.requests
      .filter(request => request.endpoint === endpoint && request.query !== undefined)
      .map(request => request.query!);
  }

  /**
   * Wait until no request is in flight anymore.
   * Queries can still send requests after their results are complete, such as for metadata,
   * and these must not outlive the test.
   */
  public async idle(): Promise<void> {
    do {
      await new Promise(resolve => setTimeout(resolve, 20));
    } while (this.pending > 0);
  }

  public readonly fetch = async(input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    this.pending++;
    try {
      return await this.respond(input, init);
    } finally {
      this.pending--;
    }
  };

  protected async respond(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const endpoint = `${url.origin}${url.pathname}`;
    const method = init?.method ?? 'GET';
    let query = url.searchParams.get('query') ?? undefined;
    if (!query && init?.body) {
      const body = String(init.body);
      query = new Headers(init.headers).get('content-type')?.startsWith('application/sparql-query') ?
        body :
        new URLSearchParams(body).get('query') ?? undefined;
    }
    const request: IMockFederationRequest = { endpoint, method, query };
    const index = this.requests.push(request) - 1;

    const intercepted = await this.interceptor?.(request, index);
    if (intercepted) {
      return intercepted;
    }
    const store = this.stores.get(endpoint);
    if (!store) {
      return new Response('Not found', { status: 404 });
    }
    // Requests without a query are service description lookups
    if (!query) {
      return new Response('', { status: 200, headers: { 'content-type': 'text/turtle' }});
    }
    return this.evaluate(store, query);
  }

  protected async evaluate(store: RDF.Store, query: string): Promise<Response> {
    try {
      const result = await this.engine.query(query, { sources: [ store ]});
      const contentType = result.resultType === 'quads' ? 'application/n-triples' : 'application/sparql-results+json';
      const { data } = await this.engine.resultToString(result, contentType);
      let body = '';
      for await (const chunk of data) {
        body += chunk;
      }
      return new Response(body, { status: 200, headers: { 'content-type': contentType }});
    } catch (error: unknown) {
      return new Response((<Error> error).message, { status: 400 });
    }
  }
}
