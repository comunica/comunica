import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ExistenceResolver } from '@comunica/types';
import { QueryEngine } from '../lib/QueryEngine';

const BINDINGS = JSON.stringify({
  head: { vars: [ 's', 'o' ]},
  results: {
    bindings: [
      { s: { type: 'uri', value: 'http://ex.org/s1' }, o: { type: 'uri', value: 'http://ex.org/o' }},
      { s: { type: 'uri', value: 'http://ex.org/s2' }, o: { type: 'uri', value: 'http://ex.org/o' }},
    ],
  },
});
const COUNT = JSON.stringify({
  head: { vars: [ 'count' ]},
  results: { bindings: [{ count: { type: 'literal', value: '2' }}]},
});

/**
 * Regression test for the interaction between the existence resolver and query source pushdown.
 *
 * A SPARQL endpoint accepts any operation, so without this guard the whole `FILTER EXISTS` was
 * handed to the endpoint, which answered the `EXISTS` against its own data while the resolver
 * that the caller installed for exactly that purpose was never called.
 */
describe('System test: QuerySparql with an existence resolver and an endpoint source', () => {
  let engine: QueryEngine;
  let server: Server;
  let url: string;
  let queries: string[];

  const query = `SELECT ?s WHERE { ?s <http://ex.org/p> ?o . FILTER EXISTS { ?s <http://ex.org/q> ?x } }`;

  beforeAll(() => {
    engine = new QueryEngine();
  });

  beforeEach(async() => {
    queries = [];
    server = createServer((request, response) => {
      let body = '';
      request.on('data', chunk => body += chunk);
      request.on('end', () => {
        const requestUrl = new URL(request.url!, 'http://localhost');
        const query = requestUrl.searchParams.get('query') ??
          (request.headers['content-type']?.includes('application/sparql-query') ?
            body :
            new URLSearchParams(body).get('query'));
        queries.push(query ?? '');
        response.writeHead(200, { 'content-type': 'application/sparql-results+json' });
        response.end(query?.includes('COUNT') ? COUNT : BINDINGS);
      });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(<AddressInfo> server.address()).port}/sparql`;
  });

  afterEach(async() => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });

  it('should answer EXISTS with the resolver instead of delegating it to the endpoint', async() => {
    // Accept the opposite of what any data-driven answer would give, to make the source visible
    const existenceResolver: ExistenceResolver = jest.fn(async(_expression, mapping) =>
      mapping.get('s')!.value === 'http://ex.org/s2');

    const bindings = await (await engine.queryBindings(query, {
      sources: [{ type: 'sparql', value: url }],
      existenceResolver,
    })).toArray();

    expect(bindings.map(entry => entry.get('s')!.value)).toEqual([ 'http://ex.org/s2' ]);
    expect(existenceResolver).toHaveBeenCalledTimes(2);
    expect(queries.filter(entry => entry.includes('EXISTS'))).toEqual([]);
  });

  it('should still delegate EXISTS to the endpoint without a resolver', async() => {
    const bindings = await (await engine.queryBindings(query, {
      sources: [{ type: 'sparql', value: url }],
    })).toArray();

    expect(bindings.map(entry => entry.get('s')!.value)).toEqual([ 'http://ex.org/s1', 'http://ex.org/s2' ]);
    expect(queries.filter(entry => entry.includes('EXISTS'))).not.toEqual([]);
  });
});
