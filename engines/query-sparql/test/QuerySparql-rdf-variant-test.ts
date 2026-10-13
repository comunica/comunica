import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { Parser } from '@traqula/parser-sparql-1-2';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { QueryEngine } from '../lib/QueryEngine';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const EX = (local: string): ReturnType<typeof DF.namedNode> => DF.namedNode(`http://example.org/${local}`);

const ENDPOINT = 'http://endpoint.example.org/sparql';

/**
 * A triple term that is valid in RDF, and the only value the endpoint holds for ex:r.
 */
const VALID_TRIPLE_TERM = DF.quad(EX('a'), EX('q'), EX('o'));
/**
 * A triple term with a literal subject, which is only valid in symmetric (and generalized) RDF.
 */
const SYMMETRIC_TRIPLE_TERM = DF.quad(<any> DF.literal('lit'), EX('q'), EX('o'));
/**
 * How SYMMETRIC_TRIPLE_TERM ends up in the VALUES clause of the queries sent to the endpoint.
 */
const SYMMETRIC_TRIPLE_TERM_STRING =
  '<<( "lit"^^<http://www.w3.org/2001/XMLSchema#string> <http://example.org/q> <http://example.org/o> )>>';

/**
 * System tests for triple terms that are only valid in symmetric or generalized RDF,
 * in combination with a SPARQL endpoint source.
 *
 * Bind joins push the bindings of one join entry into VALUES clauses of the queries sent to the endpoint.
 * The SPARQL 1.2 grammar only allows IRIs as subjects of triple terms in VALUES,
 * so such triple terms lead to queries that a SPARQL 1.2 compliant endpoint rejects,
 * which makes the whole query fail.
 * This happens regardless of the rdfVariant option for triple terms coming from (non-validated) sources,
 * and for triple terms created by TRIPLE once the rdfVariant option allows them.
 */
describe('System test: QuerySparql with triple terms outside of RDF and a SPARQL endpoint', () => {
  const parser = new Parser();
  let engine: QueryEngine;
  let receivedQueries: string[];

  /**
   * A SPARQL 1.2 compliant endpoint, rejecting queries that do not parse.
   * It holds many triples with predicate ex:r (to make bind joins attractive),
   * of which only `ex:y ex:r <<( ex:a ex:q ex:o )>>` is returned.
   */
  async function mockedFetch(input: string, init?: RequestInit): Promise<Response> {
    const url = new URL(input);
    const query = url.searchParams.get('query') ??
      (init?.body ? new URLSearchParams(String(init.body)).get('query') : null);
    // Requests without a query are service description lookups
    if (!query) {
      return new Response('', { status: 200, headers: { 'content-type': 'text/turtle' }});
    }
    receivedQueries.push(query);
    try {
      parser.parse(query);
    } catch (error: unknown) {
      return new Response(`Parse error: ${(<Error> error).message}`, { status: 400 });
    }
    const matches = query.includes('<http://example.org/r>');
    const results = query.includes('COUNT') ?
        {
          head: { vars: [ 'count' ]},
          results: { bindings: [{ count: {
            type: 'literal',
            value: matches ? '200' : '0',
            datatype: 'http://www.w3.org/2001/XMLSchema#integer',
          }}]},
        } :
        {
          head: { vars: [ 'x', 'y', 't' ]},
          results: { bindings: matches ?
              [{
                // Echo ?x, as bound in the VALUES clause of bind joins
                ...query.includes('<http://example.org/x>') ? { x: { type: 'uri', value: 'http://example.org/x' }} : {},
                y: { type: 'uri', value: 'http://example.org/y' },
                t: { type: 'triple', value: {
                  subject: { type: 'uri', value: 'http://example.org/a' },
                  predicate: { type: 'uri', value: 'http://example.org/q' },
                  object: { type: 'uri', value: 'http://example.org/o' },
                }},
              }] :
              []},
        };
    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { 'content-type': 'application/sparql-results+json' }},
    );
  }

  function createContext(objectInStore: ReturnType<typeof DF.namedNode> | typeof VALID_TRIPLE_TERM, extra = {}): any {
    const store = RdfStore.createDefault(true);
    store.addQuad(DF.quad(EX('s'), EX('p'), objectInStore));
    return { sources: [{ type: 'sparql', value: ENDPOINT }, store ], fetch: mockedFetch, ...extra };
  }

  const PREFIX = 'PREFIX : <http://example.org/>\n';

  beforeEach(() => {
    engine = new QueryEngine();
    receivedQueries = [];
  });

  describe('for triple terms from another source', () => {
    const query = `${PREFIX}SELECT * WHERE { :s :p ?t . ?y :r ?t }`;

    it('should join a valid triple term with the endpoint', async() => {
      await expect((await engine.queryBindings(query, createContext(VALID_TRIPLE_TERM))).toArray()).resolves
        .toEqualBindingsArray([
          BF.fromRecord({ t: VALID_TRIPLE_TERM, y: EX('y') }),
        ]);
      expect(receivedQueries).toContainEqual(expect.stringContaining(
        'VALUES ?t { <<( <http://example.org/a> <http://example.org/q> <http://example.org/o> )>> }',
      ));
    });

    it.each([ undefined, 'rdf', 'symmetricRDF', 'generalizedRDF' ])(
      'should send a triple term with a literal subject in VALUES, which the endpoint rejects, for rdfVariant %s',
      async(rdfVariant) => {
        await expect(async() => (await engine.queryBindings(
          query,
          createContext(SYMMETRIC_TRIPLE_TERM, rdfVariant ? { rdfVariant } : {}),
        )).toArray()).rejects.toThrow(`Invalid SPARQL endpoint response from ${ENDPOINT} (HTTP status 400)`);
        expect(receivedQueries).toContainEqual(expect.stringContaining(`VALUES ?t { ${SYMMETRIC_TRIPLE_TERM_STRING} }`));
      },
    );

    it('should still fail when lenient', async() => {
      await expect(async() => (await engine.queryBindings(
        query,
        createContext(SYMMETRIC_TRIPLE_TERM, { lenient: true }),
      )).toArray()).rejects.toThrow(`Invalid SPARQL endpoint response from ${ENDPOINT} (HTTP status 400)`);
    });
  });

  describe('for triple terms created by TRIPLE', () => {
    const query = `${PREFIX}SELECT * WHERE { :s :p ?x . BIND(TRIPLE("lit", :q, :o) AS ?t) ?y :r ?t }`;

    it.each([ undefined, 'rdf' ])(
      'should leave the triple term unbound and send UNDEF to the endpoint for rdfVariant %s',
      async(rdfVariant) => {
        await expect((await engine.queryBindings(
          query,
          createContext(EX('x'), rdfVariant ? { rdfVariant } : {}),
        )).toArray()).resolves.toEqualBindingsArray([
          BF.fromRecord({ x: EX('x'), t: VALID_TRIPLE_TERM, y: EX('y') }),
        ]);
        expect(receivedQueries).toContainEqual(expect.stringContaining('VALUES( ?x ?t ){ ( <http://example.org/x> UNDEF ) }'));
      },
    );

    it.each([ 'symmetricRDF', 'generalizedRDF' ])(
      'should send the triple term in VALUES, which the endpoint rejects, for rdfVariant %s',
      async(rdfVariant) => {
        await expect(async() => (await engine.queryBindings(
          query,
          createContext(EX('x'), { rdfVariant }),
        )).toArray()).rejects.toThrow(`Invalid SPARQL endpoint response from ${ENDPOINT} (HTTP status 400)`);
        expect(receivedQueries).toContainEqual(expect.stringContaining(
          `VALUES( ?x ?t ){ ( <http://example.org/x> ${SYMMETRIC_TRIPLE_TERM_STRING} ) }`,
        ));
      },
    );
  });
});
