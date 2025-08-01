import { QueryEngineFactory } from '@comunica/query-sparql';
import { KeyRemoteCache } from '@comunica/context-entries';

const configPath = './config.json';
const myEngine = await new QueryEngineFactory().create({ configPath });

const query = `
SELECT * WHERE {
  ?s ?p ?o.
}
`;

const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  [KeyRemoteCache.location.name]: {path:"./cache.ttl"},
  sources:["https://ruben.verborgh.org/profile/"]

});

let i = 0;
bindingsStream.on('data', (binding) => {
  console.log(binding.toString());
  i += 1;
});
bindingsStream.on('end', () => {
  console.log(`there are ${i} results`);

});
bindingsStream.on('error', (error) => {
  console.error(error);
});


