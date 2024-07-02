const QueryEngine = require('@comunica/query-sparql-rdfjs-lite').QueryEngine;
module.exports = require('@comunica/actor-init-query/spec/sparql-engine-base.js')(new QueryEngine());
