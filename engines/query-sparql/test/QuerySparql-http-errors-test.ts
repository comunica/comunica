import type { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { QueryEngine } from '../lib/QueryEngine';

/**
 * Consume the given result stream, and resolve to the error it emits.
 * Rejects if the stream ends without emitting an error.
 */
async function captureStreamError(stream: EventEmitter): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // Void any data, so that the stream starts flowing
    stream.on('data', () => {});
    stream.on('error', resolve);
    stream.on('end', () => reject(new Error('The result stream ended without emitting an error')));
  });
}

/**
 * Regression tests for https://github.com/comunica/comunica/issues/1773
 *
 * SPARQL endpoints can answer with 200 OK, stream part of the response body,
 * and then drop the connection.
 * The resulting error must be emitted on the result stream that was handed to the caller,
 * instead of on an internal stream without any listeners, as the latter crashes the process.
 */
describe('System test: QuerySparql with an endpoint that drops the response body', () => {
  let engine: QueryEngine;
  let server: Server;
  let url: string;

  beforeAll(() => {
    engine = new QueryEngine();
  });

  beforeEach(async() => {
    server = createServer((request, response) => {
      // Answer with a partial body, in the format that was requested
      if (request.headers.accept?.includes('application/sparql-results+json')) {
        response.writeHead(200, { 'content-type': 'application/sparql-results+json' });
        response.write('{ "head": { "vars": [ "s" ] }, "results": { "bindings": [ { "s": ');
      } else {
        response.writeHead(200, { 'content-type': 'application/n-triples' });
        response.write('<http://ex.org/s> <http://ex.org/p> <http://ex.org/o> .\n<http://ex.org/s2> ');
      }
      // Drop the connection halfway through the response body
      setTimeout(() => response.socket?.destroy(), 50);
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(<AddressInfo> server.address()).port}/sparql`;
  });

  afterEach(async() => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });

  it('should emit an error on the quad stream of a CONSTRUCT query', async() => {
    const quads = await engine.queryQuads('CONSTRUCT WHERE { ?s ?p ?o }', {
      sources: [{ type: 'sparql', value: url }],
    });
    await expect(captureStreamError(quads)).resolves.toBeDefined();
  });

  it('should emit an error on the bindings stream of a SELECT query', async() => {
    const bindings = await engine.queryBindings('SELECT * WHERE { ?s ?p ?o }', {
      sources: [{ type: 'sparql', value: url }],
    });
    await expect(captureStreamError(bindings)).resolves.toBeDefined();
  });
});
