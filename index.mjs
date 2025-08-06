import { QueryEngineFactory } from '@comunica/query-sparql';
import { KeyRemoteCache } from '@comunica/context-entries';

const configPath = './engines/config-query-sparql/config/config-remote-cache.json';
const myEngine = await new QueryEngineFactory().create({ configPath });

const query = `
SELECT * WHERE {
  ?s ?p ?o.
}
`;

const cacheLocation = { url: "http://127.0.0.1:9999/cache.ttl" };
 
const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  [KeyRemoteCache.location.name]: cacheLocation,
  sources:["https://ruben.verborgh.org/profile/"]

});

let i = 0;
bindingsStream.on('data', (_binding) => {
  i += 1;
});
bindingsStream.on('end', () => {
  console.log(`there are ${i} results`);

});
bindingsStream.on('error', (error) => {
  console.error(error);
});

