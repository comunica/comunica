const EventEmitter = require('node:events');
const { PassThrough } = require('readable-stream');

class ServerResponseMock extends PassThrough {
  // eslint-disable-next-line ts/explicit-member-accessibility
  constructor() {
    super();
    this.writeHead = jest.fn();
    this.end = jest.fn(message => this.onEnd && this.onEnd(message));
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
    this.listen = jest.fn();
    this.setTimeout = jest.fn();
    this.close = jest.fn();
  }
}

const http = {
  ...jest.requireActual('http'),
};
http.createServer = jest.fn(() => new ServerMock());

module.exports = {
  ServerResponseMock,
  http,
};
