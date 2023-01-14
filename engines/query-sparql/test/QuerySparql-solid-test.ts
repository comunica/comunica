import * as path from 'path';
import type { KeyPair } from '@inrupt/solid-client-authn-core';
import {
  createDpopHeader,
  generateDpopKeyPair,
  buildAuthenticatedFetch,
} from '@inrupt/solid-client-authn-core';
import type { App } from '@solid/community-server';
import { AppRunner, resolveModulePath } from '@solid/community-server';
import 'jest-rdf';
import fetch from 'node-fetch';
import { QueryEngine } from '../lib/QueryEngine';

const squad = require('rdf-quad');

const config = [{
  podName: 'example',
  email: 'hello@example.com',
  password: 'abc123',
}];

// Store global fetch to reset to after mock.
// eslint-disable-next-line no-undef
const globalFetch = globalThis.fetch;

// Use an increased timeout, since the CSS server takes too much setup time.
jest.setTimeout(40_000);

function createApp() {
  return new AppRunner().create(
    {
      mainModulePath: resolveModulePath(''),
      typeChecking: false,
    },
    resolveModulePath('config/default.json'),
    {},
    {
      port: 3_001,
      loggingLevel: 'off',
      seededPodConfigJson: path.join(__dirname, 'configs', 'solid-css-seed.json'),
    },
  );
}

interface ISecretData {
  id: string;
  secret: string;
}

// From https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/
function getSecret(): Promise<ISecretData> {
  return fetch('http://localhost:3001/idp/credentials/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: config[0].email, password: config[0].password, name: config[0].podName }),
  }).then(res => res.json());
}

interface ITokenData {
  accessToken: string;
  dpopKey: KeyPair;
}

// From https://communitysolidserver.github.io/CommunitySolidServer/5.x/usage/client-credentials/
async function refreshToken({ id, secret }: ISecretData): Promise<ITokenData> {
  const dpopKey = await generateDpopKeyPair();
  const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
  const tokenUrl = 'http://localhost:3001/.oidc/token';
  const accessToken = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      // The header needs to be in base64 encoding.
      authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
      dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
    },
    body: 'grant_type=client_credentials&scope=webid',
  })
    .then(res => res.json())
    .then(res => res.access_token);

  return { accessToken, dpopKey };
}

describe('System test: QuerySparql over Solid Pods', () => {
  let app: App;
  let engine: QueryEngine;
  let secret: ISecretData;
  let token: ITokenData;
  let authFetch: typeof fetch;

  beforeEach(() => {
    engine = new QueryEngine();
  });

  beforeAll(async() => {
    // Start up the server
    app = await createApp();
    await app.start();

    // Generate secret
    secret = await getSecret();

    // Get token
    token = await refreshToken(secret);

    // Build authenticated fetch
    authFetch = <any> await buildAuthenticatedFetch(<any>fetch, token.accessToken, { dpopKey: token.dpopKey });

    // Override global fetch with auth fetch
    // @ts-expect-error
    // eslint-disable-next-line no-undef
    globalThis.fetch = jest.fn(authFetch);
  });

  afterAll(async() => {
    await app.stop();

    // Reset global fetch. This is probably redundant, as jest clears the DOM after each file.
    // eslint-disable-next-line no-undef
    globalThis.fetch = globalFetch;
  });

  describe('Querying data from a Pod', () => {
    let resource: string;
    let i = 0;

    describe('A single resource containing <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1>', () => {
      // Create a new file in the Pod
      beforeEach(async() => {
        resource = `http://localhost:3001/${config[0].podName}/myContainer/myFile-${i++}.ttl`;
        // Create test.ttl (did not exist before)
        await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> }`, {
          sources: [ resource ],
          destination: resource,
        });
      });

      it('Should return 2 quads from resource', async() => {
        // Get data in resource file
        const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
          sources: [ resource ],
        }).then(res => res.toArray());
        expect(quads).toBeRdfIsomorphic([
          squad('ex:s', 'ex:p', 'ex:o1'),
          squad('ex:s', 'ex:p', 'ex:o1.1'),
        ]);
      });

      it('Should return 1 quads from when doing more restricted query', async() => {
        // Get data in resource file
        const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
          sources: [ resource ],
        }).then(res => res.toArray());

        expect(quads).toBeRdfIsomorphic([
          squad('ex:s', 'ex:p', 1),
        ]);
      });

      it('Should return 2 quads from resource [Link Recovery Enabled]', async() => {
        // Get data in resource file
        const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
          sources: [ resource ],
          recoverBrokenLinks: true,
        }).then(res => res.toArray());

        expect(quads).toBeRdfIsomorphic([
          squad('ex:s', 'ex:p', 'ex:o1'),
          squad('ex:s', 'ex:p', 'ex:o1.1'),
        ]);
      });

      it('Should return 1 quads from when doing more restricted query [Link Recovery Enabled]', async() => {
        // Get data in resource file
        const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
          sources: [ resource ],
          recoverBrokenLinks: true,
        }).then(res => res.toArray());

        expect(quads).toBeRdfIsomorphic([
          squad('ex:s', 'ex:p', 1),
        ]);
      });
    });

    describe('A single resource containing <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> [linkRecovery: true]',
      () => {
      // Create a new file in the Pod
        beforeEach(async() => {
          resource = `http://localhost:3001/${config[0].podName}/myContainer/myFile-${i++}.ttl`;
          // Create test.ttl (did not exist before)
          await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> }`, {
            sources: [ resource ],
            destination: resource,
            recoverBrokenLinks: true,
          });
        });

        it('Should return 2 quads from resource', async() => {
        // Get data in resource file
          const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
            sources: [ resource ],
          }).then(res => res.toArray());

          expect(quads).toBeRdfIsomorphic([
            squad('ex:s', 'ex:p', 'ex:o1'),
            squad('ex:s', 'ex:p', 'ex:o1.1'),
          ]);
        });

        it('Should return 1 quads from when doing more restricted query', async() => {
        // Get data in resource file
          const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
            sources: [ resource ],
          }).then(res => res.toArray());

          expect(quads).toBeRdfIsomorphic([
            squad('ex:s', 'ex:p', 1),
          ]);
        });

        it('Should return 2 quads from resource [Link Recovery Enabled]', async() => {
        // Get data in resource file
          const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
            sources: [ resource ],
            recoverBrokenLinks: true,
          }).then(res => res.toArray());

          expect(quads).toBeRdfIsomorphic([
            squad('ex:s', 'ex:p', 'ex:o1'),
            squad('ex:s', 'ex:p', 'ex:o1.1'),
          ]);
        });

        it('Should return 1 quads from when doing more restricted query [Link Recovery Enabled]', async() => {
        // Get data in resource file
          const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
            sources: [ resource ],
            recoverBrokenLinks: true,
          }).then(res => res.toArray());

          expect(quads).toBeRdfIsomorphic([
            squad('ex:s', 'ex:p', 1),
          ]);
        });
      });

    // TODO: Enable this once https://github.com/comunica/comunica-feature-solid/issues/43 is solved
    // eslint-disable-next-line mocha/no-skipped-tests
    describe.skip('A single resource containing <ex:s> <ex:p> <ex:o1> after deletion', () => {
      // Create a new file in the Pod
      beforeEach(async() => {
        resource = `http://localhost:3001/${config[0].podName}/myContainer/myFile-${i++}.ttl`;
        // Create test.ttl (did not exist before)
        await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> }`, {
          sources: [ resource ],
          destination: resource,
        });
        await engine.queryVoid(`DELETE DATA { <ex:s> <ex:p> <ex:o1.1> }`, {
          sources: [ resource ],
          destination: resource,
        });
      });

      it('Should return 1 quads from resource', async() => {
        // Get data in resource file
        const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
          sources: [ resource ],
        }).then(res => res.toArray());
        expect(quads).toBeRdfIsomorphic([
          squad('ex:s', 'ex:p', 1),
        ]);
      });

      it('Should return 0 quads from when doing more restricted query', async() => {
        // Get data in resource file
        const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
          sources: [ resource ],
        }).then(res => res.toArray());
        expect(quads).toHaveLength(0);
      });
    });

    describe('A single resource containing <ex:s> <ex:p> <ex:o1> . <ex:s> <ex:p> <ex:o1.1> inserted separately', () => {
      // Create a new file in the Pod
      beforeEach(async() => {
        resource = `http://localhost:3001/${config[0].podName}/myContainer/myFile-${i++}.ttl`;
        // Create test.ttl (did not exist before)
        await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1> }`, {
          sources: [ resource ],
          destination: resource,
        });

        await engine.queryVoid(`INSERT DATA { <ex:s> <ex:p> <ex:o1.1> }`, {
          sources: [ resource ],
          destination: resource,
        });
      });

      // TODO: Enable this when https://github.com/comunica/comunica-feature-solid/issues/43 is closed
      // eslint-disable-next-line mocha/no-skipped-tests
      it.skip('Should return 2 quads from resource', async() => {
        // Get data in resource file
        const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }`, {
          sources: [ resource ],
        }).then(res => res.toArray());

        expect(quads).toBeRdfIsomorphic([
          squad('ex:s', 'ex:p', 'ex:o1'),
          squad('ex:s', 'ex:p', 'ex:o1.1'),
        ]);
      });

      it('Should return 1 quads from when doing more restricted query', async() => {
        // Get data in resource file
        const quads = await engine.queryQuads(`CONSTRUCT { ?s ?p 1 } WHERE { ?s ?p <ex:o1.1> }`, {
          sources: [ resource ],
        }).then(res => res.toArray());

        expect(quads).toBeRdfIsomorphic([
          squad('ex:s', 'ex:p', 1),
        ]);
      });
    });
  });
});
