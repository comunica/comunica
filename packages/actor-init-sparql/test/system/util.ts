import { resolve } from 'path';
import { Polly } from '@pollyjs/core';
import { setupPolly } from 'setup-polly-jest';
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');

const recordingsDir = resolve(__dirname, './assets/http');

Polly.register(FSPersister);
Polly.register(NodeHttpAdapter);

// Mocks HTTP requests using Polly.JS
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
