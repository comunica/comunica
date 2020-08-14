
const IncomingMessage = require('http').IncomingMessage;

let options = {
  statusCode: 200
};

function mockSetup(mock) {
  options = mock;
}

function request(settings, func) {
  let body = new IncomingMessage();
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
    end: () => {}
  }
}

function Agent() {}

module.exports = {
  http: { request, Agent },
  https: { request, Agent },
  mockSetup
};
