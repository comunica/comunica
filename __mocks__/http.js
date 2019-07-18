const streams = require('memory-streams');

class ServerResponseMock extends streams.WritableStream {
  constructor(){
    super();
    this.writeHead = jest.fn();
    this.end = jest.fn((message) => this.onEnd && this.onEnd(message));
  }
}

function getServerResponseMock() {
  return new ServerResponseMock();
}

class ServerMock {
  constructor(){
    this.listen = jest.fn();
    this.setTimeout = jest.fn();
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
