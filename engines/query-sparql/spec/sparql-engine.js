/* eslint-disable import/no-nodejs-modules */
const http = require('node:http');
const path = require('node:path');
/* eslint-enable import/no-nodejs-modules */
const { HttpServiceSparqlEndpoint } = require('@comunica/actor-init-query');
const createTestEngine = require('@comunica/actor-init-query/spec/sparql-engine-base.js');
const QueryEngine = require('@comunica/query-sparql').QueryEngine;

const testEngine = createTestEngine(new QueryEngine());

let server;
let endpoint;

async function closeServiceDescriptionEndpoint() {
  if (!server) {
    return;
  }
  const serverToStop = server;
  server = undefined;
  endpoint = undefined;
  await new Promise((resolve, reject) => serverToStop.close(error => error ? reject(error) : resolve()));
}

testEngine.startServiceDescriptionEndpoint = async() => {
  if (endpoint) {
    return { close: closeServiceDescriptionEndpoint, endpoint };
  }

  const moduleRootPath = path.resolve(__dirname, '..');
  const service = new HttpServiceSparqlEndpoint({
    context: {
      sources: [{ value: path.join(moduleRootPath, 'test/service-description-source.ttl') }],
    },
    defaultConfigPath: path.join(moduleRootPath, 'config/config-default.json'),
    moduleRootPath,
    port: 0,
  });
  const engine = await service.engine;
  const mediaTypes = await engine.getResultMediaTypes();
  const variants = Object.entries(mediaTypes).map(([ type, quality ]) => ({ type, quality }));
  server = http.createServer(service.handleRequest.bind(service, engine, variants, process.stdout, process.stderr));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await closeServiceDescriptionEndpoint();
    throw new Error('Could not determine the service-description endpoint address.');
  }
  endpoint = `http://127.0.0.1:${address.port}/sparql`;
  return { close: closeServiceDescriptionEndpoint, endpoint };
};

module.exports = testEngine;
