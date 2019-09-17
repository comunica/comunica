const newEngine = require('@comunica/actor-init-sparql-file').newEngine;
module.exports = require('@comunica/actor-init-sparql/spec/sparql-engine-base.js')(newEngine());
