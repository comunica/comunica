
let options = {
  statusCode: 200
};

function mockSetup(mock) {
  options = mock;
}

function request(settings, func) {
  let body = options.body || {};
  Object.assign(body, {
    input: settings,
    setEncoding: () => {},
    headers: options.headers || {},
    statusCode: options.statusCode,
    url: settings.url,
    responseUrl: settings.url,
  });
  setImmediate(() => func(body));
  return {
    end: () => {}
  }
}

function Agent() {}

module.exports = {
  http: { request, Agent },
  https: { request, Agent },
  mockSetup
};