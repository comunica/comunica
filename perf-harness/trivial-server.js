// Minimal HTTP server returning a fixed SPARQL JSON result, to measure the HTTP and client floor in Node.
const http = require('node:http');
const body = JSON.stringify({ head: { vars: [ 'x' ]}, results: { bindings: [{ x: { type: 'literal', value: 'a' }}]}});
http.createServer((req, res) => {
  req.resume();
  res.writeHead(200, { 'content-type': 'application/sparql-results+json' });
  res.end(body);
}).listen(Number(process.argv[2]));
