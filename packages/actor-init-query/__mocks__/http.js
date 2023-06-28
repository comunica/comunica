const EventEmitter = require('events');
const { PassThrough } = require("readable-stream");

class ServerResponseMock extends PassThrough {
  constructor(){
    super();
    this.writeHead = jest.fn();
    this.end = jest.fn((message) => this.onEnd && this.onEnd(message));
  }
}

function getServerResponseMock() {
  return new ServerResponseMock();
}

class ServerMock extends EventEmitter {
  constructor(){
    super();
    this.listen = jest.fn();
    this.setTimeout = jest.fn();
    this.close = jest.fn();
  }
}

const http = {
  ...jest.requireActual("http"),
};
http.createServer = jest.fn(() => {
  return new ServerMock();
});

module.exports = {
  ServerResponseMock,
  http,
};
