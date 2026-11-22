import { QueryEngine } from '../lib/QueryEngine';
import { MockFederation } from './util-federation';

const ENDPOINTS = Array.from({ length: 30 }, (_, i) => `http://gateway.example.org/sparql${i}`);
const CAPACITY = 8;

/**
 * Regression test for hosts that answer 503 once they receive too many concurrent requests,
 * such as a gateway in front of many SPARQL endpoints.
 * Before, overload only made further requests to the host wait for a fixed interval, without reducing the requests
 * in flight, so the host kept answering 503 until the retries of a request ran out, and the query failed.
 */
describe('System test: QuerySparql federation with a host that is overloaded by concurrent requests', () => {
  let engine: QueryEngine;
  let federation: MockFederation;
  let inFlight: number;
  let overloaded: number;
  let maxInFlightAfterOverload: number;

  /**
   * The fetch function of the federation, of which the host answers 503 above CAPACITY requests in flight.
   */
  async function limitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    if (inFlight >= CAPACITY) {
      overloaded++;
      return new Response('Service Unavailable', { status: 503 });
    }
    inFlight++;
    if (overloaded > 0) {
      maxInFlightAfterOverload = Math.max(maxInFlightAfterOverload, inFlight);
    }
    try {
      // Requests take a while, so that they overlap
      await new Promise(resolve => setTimeout(resolve, 100));
      return await federation.fetch(input, init);
    } finally {
      inFlight--;
    }
  }

  beforeEach(() => {
    engine = new QueryEngine();
    inFlight = 0;
    overloaded = 0;
    maxInFlightAfterOverload = 0;
    federation = new MockFederation(Object.fromEntries(ENDPOINTS.map((endpoint, i) => [
      endpoint,
      `@prefix ex: <http://example.org/> . ex:s${i} ex:p ex:o${i} . ex:o${i} ex:q "${i}" .`,
    ])));
  });

  afterEach(async() => {
    await federation.idle();
  });

  it('keeps sending concurrent requests to the host once it is overloaded', async() => {
    const bindings = await (await engine.queryBindings(`
      PREFIX ex: <http://example.org/>
      SELECT ?s ?v WHERE { ?s ex:p ?o . ?o ex:q ?v }`, {
      sources: federation.sources,
      fetch: limitedFetch,
      httpRetryCount: 5,
      httpRetryDelayFallback: 0,
    })).toArray();

    expect(bindings).toHaveLength(ENDPOINTS.length);
    expect(overloaded).toBeGreaterThan(0);
    // Requests are not sent one after another once the host signalled overload
    expect(maxInFlightAfterOverload).toBeGreaterThan(1);
  }, 30_000);
});
