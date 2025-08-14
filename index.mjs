import { QueryEngineFactory } from '@comunica/query-sparql';
import { KeyRemoteCache } from '@comunica/context-entries';
import {LoggerPretty} from "@comunica/logger-pretty";

/**
 * Sour assignation assignOperationSource
 * with MediatorOptimizeQueryOperation
 * and ActorQueryProcessSequential
 */
const configPath = './engines/config-query-sparql/config/config-remote-cache.json';
const myEngine = await new QueryEngineFactory().create({ configPath });

let query = `
PREFIX ex: <http://example.org/>

SELECT ?person ?city
WHERE {
  ?person ex:livesIn ?city .
  ?city ex:locatedIn ex:CountryX .
  ?person ex:hasOccupation ex:Engineer .
  ?person ex:gender ex:female .
}
`;
query = `SELECT * WHERE {?s ?p ?o}`;

const cacheLocation = { url: "http://127.0.0.1:9999/cache.ttl" };
 
const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  [KeyRemoteCache.location.name]: cacheLocation,
  sources:["https://ruben.verborgh.org/profile/"],
  log: new LoggerPretty({ level: 'info'}),
  '@comunica/core:log':new LoggerPretty({ level: 'info'})
});

let i = 0;
bindingsStream.getProperty("provenance", (val)=>{
  console.log("getting properties");
  console.log(val);
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

