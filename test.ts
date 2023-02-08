import { KeysCore, KeysHttp } from './packages/context-entries';
import { Session } from '@inrupt/solid-client-authn-node';
import { QueryEngine } from './engines/query-sparql';
// import { QueryEngine } from '@comunica/query-sparql-solid';
import { LoggerPretty } from './packages/logger-pretty'

async function main() {
  const session = new Session();

  

  const engine = new QueryEngine();

  const links = new Set<string>();

  const authFetch = session.fetch
  session.fetch = (...args) => {
    links.add(args[0] as string)
    console.log(args[0])
    return authFetch(...args);
  }

  const queries = [
    // `SELECT * WHERE { ?s ?p ?o }`,
    // `SELECT * WHERE { ?s <http://www.w3.org/ns/ldp#contains> ?o }`,
    // `SELECT * WHERE { ?s <http://www.w3.org/ns/ldp#contains> ?o } LIMIT 1`,
    `
    PREFIX ldp: <http://www.w3.org/ns/ldp#>
    SELECT * WHERE {
      GRAPH ?g {
        ?s ldp:contains ?o .
      }
    } LIMIT 30`,
    // `
    // PREFIX ldp: <http://www.w3.org/ns/ldp#>
    // SELECT * WHERE {
    //   GRAPH ?g {
    //     ?s ldp:contains ?o .
    //   }
    // } LIMIT 1`,
    // `
    // SELECT * WHERE {
    //   GRAPH ?g {
    //     ?s ?p ?o .
    //   }
    // } LIMIT 1
    // `,
    // `
    // SELECT * WHERE {
    //   GRAPH ?g {
    //     ?s ?p ?o .
    //   }
    // }
    // `
  ]

  for (const query of queries) {

    console.log('='.repeat(200))
    console.log('='.repeat(200))
    console.log(query)
    console.log('='.repeat(200))

    const quads = await engine.queryBindings(query, {
      sources: [
        `https://fragments.ap.inrupt.com/qpf?storage=${encodeURIComponent('https://storage.ap.inrupt.com/311cdda9-cb55-465b-861d-5b1e4dc6ea38/')}`,
      ],
      // '@comunica/actor-http-inrupt-solid-client-authn:session': session,
      [KeysHttp.fetch.name]: session.fetch,
      // [KeysCore.log.name]: new LoggerPretty({ level: 'trace' })
    });

    const resq = (await quads.map(elem => [elem.get('s')?.value, elem.get('p')?.value, elem.get('o')?.value, elem.get('g')?.value]).toArray());

    console.log(resq.length)

    for (const link of links) {
      console.log(`---------- [${link}]`)

      const res = await authFetch(link)
      console.log(await res.text())
    }
  }

  await session.logout();
}

main();
