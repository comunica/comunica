const QueryEngine = require('@comunica/query-sparql-file').QueryEngine;
module.exports = require('@comunica/actor-init-query/spec/sparql-engine-base.cjs')(new QueryEngine());
