import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { HttpServiceGraphStore } from '../lib/HttpServiceGraphStore';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);

const graphStoreIri = 'http://example.org/store';
const quad = DF.quad(
  DF.namedNode('http://example.org/s'),
  DF.namedNode('http://example.org/p'),
  DF.namedNode('http://example.org/o'),
);

function makeRequest(method: string, url: string, contentType?: string): any {
  return { method, url, headers: contentType ? { 'content-type': contentType } : {}};
}

function parseUrl(url: string): any {
  const parsed = new URL(url, graphStoreIri);
  const query: Record<string, string | string[]> = {};
  for (const key of new Set(parsed.searchParams.keys())) {
    const values = parsed.searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }
  return { pathname: parsed.pathname, query };
}

describe('HttpServiceGraphStore', () => {
  let engine: any;
  let quads: RDF.Quad[];
  let exists: boolean;
  let protocol: HttpServiceGraphStore;
  const context = { sources: [ 'store' ]};

  beforeEach(() => {
    quads = [ quad ];
    exists = true;
    engine = {
      query: jest.fn(async() => ({
        resultType: 'quads',
        execute: async() => new ArrayIterator(quads, { autoStart: false }),
      })),
      queryBoolean: jest.fn(async() => exists),
      queryVoid: jest.fn(async() => undefined),
    };
    protocol = new HttpServiceGraphStore(context);
  });

  describe('getTarget', () => {
    function getTarget(method: string, url: string, contentType?: string): any {
      return HttpServiceGraphStore.getTarget(makeRequest(method, url, contentType), parseUrl(url), graphStoreIri);
    }

    it('should identify a graph directly through the request path', () => {
      expect(getTarget('GET', '/store/person/1.ttl'))
        .toEqual({ graph: DF.namedNode('http://example.org/store/person/1.ttl') });
    });

    it('should ignore the query of a directly identified graph', () => {
      expect(getTarget('GET', '/store/person/1.ttl?a=b'))
        .toEqual({ graph: DF.namedNode('http://example.org/store/person/1.ttl') });
    });

    it('should identify a graph indirectly through the graph parameter', () => {
      expect(getTarget('GET', '/store?graph=http%3A%2F%2Fexample.org%2Fg'))
        .toEqual({ graph: DF.namedNode('http://example.org/g') });
    });

    it('should only decode the graph parameter once', () => {
      expect(getTarget('GET', '/store?graph=http://example.org/%2531'))
        .toEqual({ graph: DF.namedNode('http://example.org/%31') });
    });

    it('should identify the default graph through the default parameter', () => {
      expect(getTarget('GET', '/store?default')).toEqual({ graph: DF.defaultGraph() });
    });

    it('should reject more than one graph parameter', () => {
      expect(getTarget('GET', '/store?graph=http://example.org/a&graph=http://example.org/b'))
        .toEqual({ error: 'A request can only contain a single graph parameter' });
    });

    it.each([ 'GET', 'HEAD', 'PUT', 'POST', 'DELETE' ])('should identify the graph store itself for a %s', (method) => {
      expect(getTarget(method, '/store')).toEqual({});
    });

    it('should not apply to a request without a path', () => {
      expect(HttpServiceGraphStore
        .getTarget(makeRequest('GET', '/store'), <any> { query: {}}, graphStoreIri)).toBeUndefined();
    });

    it('should not apply to a path outside of the graph store', () => {
      expect(getTarget('GET', '/sparql')).toBeUndefined();
      expect(getTarget('GET', '/other/person/1.ttl')).toBeUndefined();
    });

    it('should not apply to a path that only shares a prefix with the graph store', () => {
      expect(getTarget('GET', '/storeother')).toBeUndefined();
    });
  });

  describe('getMethodAdvertisementHeaders', () => {
    it('should advertise the methods of a graph', () => {
      expect(HttpServiceGraphStore.getMethodAdvertisementHeaders({ graph: DF.namedNode('http://example.org/g') }))
        .toEqual({
          'Access-Control-Allow-Methods': 'DELETE, GET, HEAD, OPTIONS, POST, PUT',
          Allow: 'DELETE, GET, HEAD, OPTIONS, POST, PUT',
        });
    });

    it('should advertise the methods of the graph store itself', () => {
      expect(HttpServiceGraphStore.getMethodAdvertisementHeaders({})).toEqual({
        'Access-Control-Allow-Methods': 'OPTIONS, POST',
        Allow: 'OPTIONS, POST',
      });
    });
  });

  describe('getMediaType', () => {
    it('should remove the parameters of a content type', () => {
      expect(HttpServiceGraphStore.getMediaType('text/turtle; charset=utf-8')).toBe('text/turtle');
    });

    it('should keep a content type without parameters', () => {
      expect(HttpServiceGraphStore.getMediaType('text/turtle')).toBe('text/turtle');
    });
  });

  describe('splitMultipart', () => {
    const body = [
      '--BOUNDARY',
      'Content-Disposition: form-data; name="a.ttl"',
      'Content-Type: text/turtle; charset=utf-8',
      '',
      '<http://example.org/s> <http://example.org/p> "a" .',
      '--BOUNDARY',
      'Content-Type: application/n-triples',
      '',
      '<http://example.org/s> <http://example.org/p> "b" .',
      '--BOUNDARY--',
      '',
    ].join('\r\n');

    it('should split the parts of a payload', () => {
      expect(HttpServiceGraphStore.splitMultipart(body, 'multipart/form-data; boundary=BOUNDARY')).toEqual([
        { contentType: 'text/turtle; charset=utf-8', body: '<http://example.org/s> <http://example.org/p> "a" .' },
        { contentType: 'application/n-triples', body: '<http://example.org/s> <http://example.org/p> "b" .' },
      ]);
    });

    it('should accept a quoted boundary', () => {
      expect(HttpServiceGraphStore.splitMultipart(body, 'multipart/form-data; boundary="BOUNDARY"'))
        .toHaveLength(2);
    });

    it('should require a boundary', () => {
      expect(() => HttpServiceGraphStore.splitMultipart(body, 'multipart/form-data'))
        .toThrow('must declare a boundary');
    });

    it('should require a header section in every part', () => {
      const withoutHeaders = '--BOUNDARY\r\nno headers\r\n--BOUNDARY--\r\n';
      expect(() => HttpServiceGraphStore.splitMultipart(withoutHeaders, 'multipart/form-data; boundary=BOUNDARY'))
        .toThrow('missing a header section');
    });

    it('should require a content type in every part', () => {
      const withoutType = '--BOUNDARY\r\nContent-Disposition: form-data\r\n\r\nbody\r\n--BOUNDARY--\r\n';
      expect(() => HttpServiceGraphStore.splitMultipart(withoutType, 'multipart/form-data; boundary=BOUNDARY'))
        .toThrow('missing a content type');
    });
  });

  describe('handleRequest', () => {
    const readBody = async(): Promise<string> => '<http://example.org/s> <http://example.org/p> <http://example.org/o> .';
    const graph = DF.namedNode('http://example.org/g');

    it('should reject a request that does not address a graph store resource', async() => {
      await expect(protocol.handleRequest(
        engine,
        makeRequest('PUT', '/store'),
        { error: 'Not a graph' },
        graphStoreIri,
        readBody,
      )).resolves.toEqual({ status: 400, message: 'Not a graph' });
    });

    it('should reject a method that the protocol does not define', async() => {
      await expect(protocol.handleRequest(
        engine,
        makeRequest('TRACE', '/store/g'),
        { graph },
        graphStoreIri,
        readBody,
      )).resolves.toEqual({
        status: 405,
        headers: {
          'Access-Control-Allow-Methods': 'DELETE, GET, HEAD, OPTIONS, POST, PUT',
          Allow: 'DELETE, GET, HEAD, OPTIONS, POST, PUT',
        },
        message: 'Incorrect HTTP method',
      });
    });

    it.each([ 'GET', 'HEAD', 'PUT', 'DELETE' ])('should reject a %s on the graph store itself', async(method) => {
      await expect(protocol.handleRequest(
        engine,
        makeRequest(method, '/store'),
        {},
        graphStoreIri,
        readBody,
      )).resolves.toEqual({
        status: 405,
        headers: { 'Access-Control-Allow-Methods': 'OPTIONS, POST', Allow: 'OPTIONS, POST' },
        message: 'Only POST requests may address the graph store itself, other requests must identify a graph',
      });
      expect(engine.query).not.toHaveBeenCalled();
      expect(engine.queryVoid).not.toHaveBeenCalled();
    });

    it('should turn an error into a bad request', async() => {
      await expect(protocol.handleRequest(
        engine,
        makeRequest('PUT', '/store/g'),
        { graph },
        graphStoreIri,
        readBody,
      )).resolves.toEqual({ status: 400, message: 'A request with an RDF payload must declare its content type' });
    });

    it.each([ 'GET', 'HEAD' ])('should retrieve the graph for %s', async(method) => {
      const result = await protocol
        .handleRequest(engine, makeRequest(method, '/store/g'), { graph }, graphStoreIri, readBody);

      expect(result.status).toBe(200);
      expect(engine.query).toHaveBeenCalledWith(
        AF.createConstruct(
          AF.createBgp([ AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), graph) ]),
          [ AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) ],
        ),
        context,
      );
    });

    it('should retrieve the default graph without checking that it exists', async() => {
      const result = await protocol.handleRequest(
        engine,
        makeRequest('GET', '/store?default'),
        { graph: DF.defaultGraph() },
        graphStoreIri,
        readBody,
      );

      expect(result.status).toBe(200);
      expect(engine.queryBoolean).not.toHaveBeenCalled();
    });

    it('should respond with 404 when retrieving a graph that does not exist', async() => {
      exists = false;
      await expect(protocol
        .handleRequest(engine, makeRequest('GET', '/store/g'), { graph }, graphStoreIri, readBody))
        .resolves.toEqual({ status: 404, message: 'The graph http://example.org/g does not exist.' });
      expect(engine.queryBoolean).toHaveBeenCalledWith(
        AF.createAsk(AF.createBgp([ AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), graph) ])),
        context,
      );
    });

    it('should delete a graph', async() => {
      await expect(protocol
        .handleRequest(engine, makeRequest('DELETE', '/store/g'), { graph }, graphStoreIri, readBody))
        .resolves.toEqual({ status: 204 });
      expect(engine.queryVoid).toHaveBeenCalledWith(AF.createDrop(graph, true), context);
    });

    it('should delete the default graph', async() => {
      await expect(protocol.handleRequest(
        engine,
        makeRequest('DELETE', '/store?default'),
        { graph: DF.defaultGraph() },
        graphStoreIri,
        readBody,
      )).resolves.toEqual({ status: 204 });
      expect(engine.queryVoid).toHaveBeenCalledWith(AF.createDrop('DEFAULT', true), context);
    });

    it('should respond with 404 when deleting a graph that does not exist', async() => {
      exists = false;
      await expect(protocol
        .handleRequest(engine, makeRequest('DELETE', '/store/g'), { graph }, graphStoreIri, readBody))
        .resolves.toEqual({ status: 404, message: 'The graph http://example.org/g does not exist.' });
      expect(engine.queryVoid).not.toHaveBeenCalled();
    });

    it('should replace the contents of an existing graph on PUT', async() => {
      const request = makeRequest('PUT', '/store/g', 'text/turtle');
      await expect(protocol.handleRequest(engine, request, { graph }, graphStoreIri, readBody))
        .resolves.toEqual({ status: 204 });
      expect(engine.queryVoid).toHaveBeenCalledWith(AF.createCompositeUpdate([
        AF.createDrop(graph, true),
        AF.createDeleteInsert(undefined, [
          AF.createPattern(quad.subject, quad.predicate, quad.object, graph),
        ]),
      ]), context);
    });

    it('should respond with 201 when PUT creates a graph', async() => {
      exists = false;
      const request = makeRequest('PUT', '/store/g', 'text/turtle');
      await expect(protocol.handleRequest(engine, request, { graph }, graphStoreIri, readBody))
        .resolves.toEqual({ status: 201, headers: {}});
    });

    it('should only drop the graph when PUT has an empty payload', async() => {
      quads = [];
      const request = makeRequest('PUT', '/store/g', 'text/turtle');
      await expect(protocol.handleRequest(engine, request, { graph }, graphStoreIri, readBody))
        .resolves.toEqual({ status: 204 });
      expect(engine.queryVoid).toHaveBeenCalledWith(AF.createCompositeUpdate([
        AF.createDrop(graph, true),
      ]), context);
    });

    it('should merge into an existing graph on POST', async() => {
      const request = makeRequest('POST', '/store?graph=http://example.org/g', 'text/turtle');
      await expect(protocol.handleRequest(engine, request, { graph }, graphStoreIri, readBody))
        .resolves.toEqual({ status: 204 });
      expect(engine.queryVoid).toHaveBeenCalledWith(AF.createCompositeUpdate([
        AF.createDeleteInsert(undefined, [
          AF.createPattern(quad.subject, quad.predicate, quad.object, graph),
        ]),
      ]), context);
    });

    it('should not update the store when POST has an empty payload', async() => {
      quads = [];
      const request = makeRequest('POST', '/store?graph=http://example.org/g', 'text/turtle');
      await expect(protocol.handleRequest(engine, request, { graph }, graphStoreIri, readBody))
        .resolves.toEqual({ status: 204 });
      expect(engine.queryVoid).not.toHaveBeenCalled();
    });

    it('should create a graph and return its location on POST to the graph store', async() => {
      const request = makeRequest('POST', '/store', 'text/turtle');
      const result = await protocol.handleRequest(engine, request, {}, graphStoreIri, readBody);

      expect(result.status).toBe(201);
      expect(result.headers!.Location).toMatch(/^http:\/\/example\.org\/store\/[\da-f-]{36}$/u);
      expect(engine.queryBoolean).not.toHaveBeenCalled();
    });

    it('should parse the payload against the request IRI', async() => {
      const request = makeRequest('PUT', '/store/person/1.ttl', 'text/turtle; charset=utf-8');
      await protocol.handleRequest(engine, request, { graph }, graphStoreIri, readBody);

      expect(engine.query).toHaveBeenCalledWith(expect.anything(), {
        sources: [{
          type: 'serialized',
          value: '<http://example.org/s> <http://example.org/p> <http://example.org/o> .',
          mediaType: 'text/turtle',
          baseIRI: 'http://example.org/store/person/1.ttl',
        }],
      });
    });

    it('should parse the payload against the endpoint when the request has no URL', async() => {
      const request = makeRequest('PUT', '/store/g', 'text/turtle');
      delete request.url;
      await protocol.handleRequest(engine, request, { graph }, graphStoreIri, readBody);

      expect(engine.query).toHaveBeenCalledWith(
        expect.anything(),
        { sources: [ expect.objectContaining({ baseIRI: graphStoreIri }) ]},
      );
    });

    it('should merge every part of a multipart payload', async() => {
      const body = [
        '--B',
        'Content-Type: text/turtle',
        '',
        '<http://example.org/s> <http://example.org/p> "a" .',
        '--B',
        'Content-Type: text/turtle',
        '',
        '<http://example.org/s> <http://example.org/p> "b" .',
        '--B--',
        '',
      ].join('\r\n');
      const request = makeRequest('POST', '/store/g', 'multipart/form-data; boundary=B');
      await protocol.handleRequest(engine, request, { graph }, graphStoreIri, async() => body);

      expect(engine.query).toHaveBeenCalledTimes(2);
      expect((<Algebra.CompositeUpdate> engine.queryVoid.mock.calls[0][0]).updates).toHaveLength(1);
      expect((engine.queryVoid.mock.calls[0][0]).updates[0].insert).toHaveLength(2);
    });
  });
});
