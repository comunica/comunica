import { resolve } from 'path';
import { Polly } from '@pollyjs/core';
import { setupPolly } from 'setup-polly-jest';

const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');

const recordingsDir = resolve(__dirname, './assets/http');

Polly.register(FSPersister);
Polly.register(NodeHttpAdapter);

// Configure everything related to PollyJS
// eslint-disable-next-line mocha/no-exports
export function usePolly() {
  const pollyContext = mockHttp();

  // eslint-disable-next-line mocha/no-top-level-hooks
  beforeEach(() => {
    pollyContext.polly.server.any().on('beforePersist', (req, recording) => {
      recording.request.headers = recording.request.headers.filter(({ name }: any) => name !== 'user-agent');
    });
  });

  // eslint-disable-next-line mocha/no-top-level-hooks
  afterEach(async() => {
    await pollyContext.polly.flush();
  });
}

// Mocks HTTP requests using Polly.JS
// eslint-disable-next-line mocha/no-exports
export function mockHttp() {
  return setupPolly({
    adapters: [ NodeHttpAdapter ],
    persister: FSPersister,
    persisterOptions: { fs: { recordingsDir }},
    recordFailedRequests: true,
    matchRequestsBy: {
      headers: {
        exclude: [ 'user-agent' ],
      },
    },
  });
}
