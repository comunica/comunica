import { QueryEngineFactory } from '@comunica/query-sparql';
import { KeyRemoteCache } from '@comunica/context-entries';
import {
  parseCache
} from 'sparql-cache-client';
const configPath = './config.json';
const myEngine = await new QueryEngineFactory().create({ configPath });
import { rdfDereferencer } from 'rdf-dereference';

const query = `
SELECT * WHERE {
  ?s ?p ?o.
}
`;

const cacheLocation = { url: "http://127.0.0.1:9999/cache.ttl" };
//const { data: d } = await rdfDereferencer.dereference(cacheLocation.path, { localFiles: true });

//console.log(d);

//const cache = await parseCache(cacheLocation);
//console.log(cache);


 
const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  [KeyRemoteCache.location.name]: cacheLocation,
  sources:["https://ruben.verborgh.org/profile/"]

});

let i = 0;
bindingsStream.on('data', (binding) => {
  //console.log(binding.toString());
  i += 1;
});
bindingsStream.on('end', () => {
  console.log(`there are ${i} results`);

});
bindingsStream.on('error', (error) => {
  console.error(error);
});

