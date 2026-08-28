import EventEmitter from 'node:events';
import { PassThrough } from 'readable-stream';
import { vi } from 'vitest';

// 'node:http' is mocked with this module, so the real one has to be pulled in explicitly
const actualHttp = await vi.importActual('node:http');

class ServerResponseMock extends PassThrough {
  // eslint-disable-next-line ts/explicit-member-accessibility
  constructor() {
    super();
    this.writeHead = vi.fn();
    this.end = vi.fn(message => this.onEnd && this.onEnd(message));
  }
}

// eslint-disable-next-line unused-imports/no-unused-vars
function getServerResponseMock() {
  return new ServerResponseMock();
}

class ServerMock extends EventEmitter {
  // eslint-disable-next-line ts/explicit-member-accessibility
  constructor() {
    super();
    this.listen = vi.fn();
    this.setTimeout = vi.fn();
    this.close = vi.fn();
  }
}

const http = {
  ...actualHttp,
  createServer: vi.fn(() => new ServerMock()),
};

export { http, ServerResponseMock };
