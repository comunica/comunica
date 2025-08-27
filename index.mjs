import { QueryEngineFactory } from '@comunica/query-sparql';
import { KeyRemoteCache } from '@comunica/actor-query-process-remote-cache';
import {LoggerPretty} from "@comunica/logger-pretty";

/**
 * Sour assignation assignOperationSource
 * with MediatorOptimizeQueryOperation
 * and ActorQueryProcessSequential
 */
const configPath = './engines/config-query-sparql/config/config-remote-cache.json';
const myEngine = await new QueryEngineFactory().create({ configPath });

const query = `
PREFIX rh: <http://rdf.rhea-db.org/>
PREFIX up: <http://purl.uniprot.org/core/>

SELECT ?uniprot ?rhea ?accession ?equation
WHERE {
  SERVICE <https://sparql.uniprot.org/sparql> {
      VALUES (?rhea) { (<http://rdf.rhea-db.org/19649>) (<http://rdf.rhea-db.org/11312>)}
      ?uniprot up:reviewed true .
      ?uniprot up:organism ?taxid .
      ?uniprot up:annotation/up:catalyticActivity/up:catalyzedReaction ?rhea .
      ?uniprot up:mnemonic ?mnemo .

  }
  ?rhea rh:accession ?accession .
  ?rhea rh:equation ?equation .
}
`;
const cacheLocation = { url: "http://127.0.0.1:9999/cache.ttl" };
 
const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  [KeyRemoteCache.location.name]: cacheLocation,
  [KeyRemoteCache.valueClauseBlockSize.name]: 20_000,
  sources:["https://sparql.rhea-db.org/sparql/"],
  log: new LoggerPretty({ level: 'info'}),
  //failOnCacheMiss: true,
  '@comunica/core:log':new LoggerPretty({ level: 'info'})
});

let i = 0;
bindingsStream.getProperty("provenance", (val)=>{
  //console.log(`provenance: ${JSON.stringify(val, null, 2)}`);
  console.log("we have the provenance my man!")
});

bindingsStream.on('data', (_binding) => {
  i += 1;
});
bindingsStream.on('end', () => {
  console.log(`there are ${i} results`);

});
bindingsStream.on('error', (error) => {
  console.error(error);
});

