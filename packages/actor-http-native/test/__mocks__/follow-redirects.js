import { IncomingMessage } from 'node:http';
import { vi } from 'vitest';

let options = {
  statusCode: 200
};

export function mockSetup(mock) {
  options = mock;
}

function request(settings, func) {
  let body = new IncomingMessage();
  body.destroy = vi.fn();
  Object.assign(settings.headers, options.headers || {});
  Object.assign(body, options.body || {}, {
    input: settings,
    setEncoding: () => {},
    headers: settings.headers,
    statusCode: options.statusCode,
    url: settings.url,
    responseUrl: settings.url,
    withCredentials: settings.withCredentials,
  });
  setImmediate(() => func(body));

  return {
    abort: () => { },
    on: (type, callback) => {
      if (type === 'error' && options.error) {
        setImmediate(() => callback(new Error('Request Error!')));
      }
    },
    once: (type, callback) => {
      if (type === 'error' && options.error) {
        setImmediate(() => callback(new Error('Request Error!')));
      }
    },
    emit: () => {},
    end: () => {},
    write: () => {},
  }
}

function Agent() {}

export const http = { request, Agent };
export const https = { request, Agent };
