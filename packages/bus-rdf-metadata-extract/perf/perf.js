const ActorRdfMetadataExtractQuery = require('../lib/ActorRdfMetadataExtractQuery').ActorRdfMetadataExtractQuery;
const Bus = require('@comunica/core').Bus;
const queryEngine = require('../../actor-init-sparql').newEngine();
const stream = require('streamify-array');
const quad = require('rdf-quad');

const HYDRA = 'http://www.w3.org/ns/hydra/core#';
const context = {
  "@context": {
    "hydra": "http://www.w3.org/ns/hydra/core#",
    "void": "http://rdfs.org/ns/void#",

    "Collection": "hydra:Collection",
    "search": "hydra:search",
    "template": "hydra:template",
    "variableRepresentation": "hydra:variableRepresentation",
    "mapping": "hydra:mapping",
    "variable": "hydra:variable",
    "property": "hydra:property",

    "subset": "void:subset"
  }
};
const query = `
    query($pageUrl: String) @single(scope: all) {
      graph
      ... on Collection {
        subset(_: $pageUrl)
        search @plural {
          variableRepresentation @optional
          template
          mapping @optional @plural {
            variable
            property
          }
        }
      }
    }`;
const queryNoOpts = `
    query($pageUrl: String) @single(scope: all) {
      graph

        subset(_: $pageUrl)
        search @plural {
          variableRepresentation
          template
          mapping @plural {
            variable
            property
          }
        }

    }`;

let actor;
async function init() {
  console.time('init');
  actor = new ActorRdfMetadataExtractQuery(context, query, { queryEngine, bus: new Bus({ name: 'bus' }) });
  await actor.sparqlOperation;
  console.timeEnd('init');
}

async function run(amount) {
  console.time('run ' + amount);
  for (let i = 0; i < amount; i++) {
    const metadata = stream([
      quad('subset', HYDRA + 'search', 'search1'),
      quad('search1', HYDRA + 'template', 'http://example.org/{?a,b}'),
      quad('search1', HYDRA + 'mapping', 'mapping1'),
      quad('search1', HYDRA + 'mapping', 'mapping2'),
      quad('mapping1', HYDRA + 'variable', 'a'),
      quad('mapping1', HYDRA + 'property', 'propa'),
      quad('mapping2', HYDRA + 'variable', 'b'),
      quad('mapping2', HYDRA + 'property', 'propb'),
      quad('subset', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', HYDRA + 'Collection'),
      quad('subset', 'http://rdfs.org/ns/void#subset', 'mypage'),
      quad('mypage', 'somethingelse', 'somevalue'),
    ]);
    await actor.queryData(metadata, {'?pageUrl': 'mypage'});
  }
  console.timeEnd('run ' + amount);
}

async function perf() {
  await init();
  await run(1);
  //await run(10);
  //await run(20);
}

perf();

// TODO: bottleneck is in querying itself!
// the optionals are NOT the problem
// N3Store is NOT the problem, just takes 1.295ms in total
// calling mediatorQueryOperation.mediate is slow?
