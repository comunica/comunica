import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import '@comunica/utils-jest';
import { QueryEngine } from '../lib/QueryEngine';

const DF = new DataFactory();

describe('System test: HttpRetryBody', () => {
  let engine: QueryEngine;

  beforeAll(() => {
    engine = new QueryEngine();
  });

  it('should retry when the response body stream breaks', async() => {
    const turtle = '<http://example.org/s> <http://example.org/p> <http://example.org/o> .\n';
    const contentLength = Buffer.byteLength(turtle);
    let getRequests = 0;

    const server = createServer((req, res) => {
      if (req.method === 'HEAD') {
        res.writeHead(200, { 'Content-Type': 'text/turtle', 'Content-Length': contentLength });
        res.end();
        return;
      }

      getRequests++;
      res.writeHead(200, { 'Content-Type': 'text/turtle', 'Content-Length': contentLength });
      res.flushHeaders();

      if (getRequests === 1) {
        res.write(turtle.slice(0, 20), () => res.socket?.destroy());
      } else {
        res.end(turtle);
      }
    });

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (<AddressInfo> server.address()).port;
    const url = `http://127.0.0.1:${port}/data.ttl`;

    try {
      const quads = await arrayifyStream(await engine.queryQuads('CONSTRUCT WHERE { ?s ?p ?o }', {
        sources: [ url ],
        httpRetryBodyCount: 1,
      }));

      expect(quads).toEqual([
        DF.quad(
          DF.namedNode('http://example.org/s'),
          DF.namedNode('http://example.org/p'),
          DF.namedNode('http://example.org/o'),
        ),
      ]);
      expect(getRequests).toBe(2);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
