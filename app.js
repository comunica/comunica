#!/usr/bin/env node
const engine = require('@comunica/actor-init-sparql').newEngine();
const LoggerPretty = require('@comunica/logger-pretty').LoggerPretty;
const fs = require('fs');
const Algebra = require('sparqlalgebrajs/lib/algebra');
async function runQuery(q, context) {

  const printBindings = false;
  const printProv = true;
  const printFlattenedQueryOperation = true;
  const printObservedRecords = true;

  console.log('----------------------------------------------')
  console.log(`Query:\n${q}\n`)
  console.log('Context:\n', context);
  console.log('----------------------------------------------')

  const result = await engine.query(q, context);



  if(printBindings){
    const bindings = await result.bindings();
    console.log(`nr. bindings: ${bindings.length}`)
    for(b of bindings) {
      console.log(result.variables.map(v=>`${v}: ${b.get(v).value}`))
    }

  }


  console.log('----------------------------------------------')
  console.log('metadata');
  const metadata = await result.metadata();
  const metadataKeys = Object.keys(metadata)
  console.log('metadata keys: ', metadataKeys)

  console.log(JSON.stringify(metadata, null, 2));



}


const queries = [
  'SELECT ?s WHERE { ?s ?p ?o } LIMIT 5',

  `PREFIX foaf: <http://xmlns.com/foaf/0.1/>

  SELECT ?s ?interestName
  WHERE {
    ?s foaf:topic_interest ?interest.
    ?interest rdfs:label ?interestName.
    FILTER LANGMATCHES(LANG(?interestName),  "EN")
  }
`,
  'SELECT ?s (COUNT(?s) AS ?count) WHERE { ?s ?p ?o } GROUPBY ?s LIMIT 5',
  `PREFIX foaf: <http://xmlns.com/foaf/0.1/>

  SELECT ?s ?interestName
  WHERE {
    ?s foaf:topic_interest ?interest.
    ?interest rdfs:label ?interestName.
  }
  LIMIT 5
`,
  `PREFIX foaf: <http://xmlns.com/foaf/0.1/>

  SELECT ?s ?interest
  WHERE {
    ?s foaf:topic_interest ?interest.
  }
  LIMIT 10
`
]
const qs = queries[4]
const context = {
  sources : [
    'https://ruben.verborgh.org/profile/',
    'https://www.rubensworks.net/'
  ],
  // log: new LoggerPretty({level:'trace'})
}


console.log('oooooooooo')
Promise.all([runQuery(qs, context)])
