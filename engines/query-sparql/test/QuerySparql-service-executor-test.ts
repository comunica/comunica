import type { ServiceExecutor } from '@comunica/types';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { QueryEngine } from '../lib/QueryEngine';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const EX = (local: string): ReturnType<typeof DF.namedNode> => DF.namedNode(`http://example.org/${local}`);

const ENDPOINT = 'http://endpoint.example.org/sparql';
const SERVICE = 'urn:my-app:service';
const PREFIX = 'PREFIX : <http://example.org/>\n';

/**
 * System tests for SERVICE clauses that are evaluated by custom SERVICE executors.
 */
describe('System test: QuerySparql with custom SERVICE executors', () => {
  let engine: QueryEngine;
  let endpointQueries: string[];

  async function mockedFetch(input: string, init?: RequestInit): Promise<Response> {
    const url = new URL(input);
    const endpoint = `${url.origin}${url.pathname}`;
    const query = url.searchParams.get('query') ??
      (init?.body ? new URLSearchParams(String(init.body)).get('query') : null);
    if (endpoint !== ENDPOINT) {
      return new Response(null, { status: 404 });
    }
    if (!query) {
      return new Response('', { status: 200, headers: { 'content-type': 'text/turtle' }});
    }
    endpointQueries.push(query);
    return new Response(
      JSON.stringify({
        head: { vars: [ 'x', 'v' ]},
        results: { bindings: [{ x: { type: 'uri', value: 'http://example.org/a' }, v: { type: 'literal', value: '1' }}]},
      }),
      { status: 200, headers: { 'content-type': 'application/sparql-results+json' }},
    );
  }

  function createStore(): RdfStore {
    const store = RdfStore.createDefault(true);
    store.addQuad(DF.quad(EX('a'), EX('val'), DF.literal('1')));
    store.addQuad(DF.quad(EX('b'), EX('val'), DF.literal('2')));
    return store;
  }

  function createSubjectExecutor(calls: { name: string; binding: RDF.Bindings | undefined }[]): ServiceExecutor {
    return async(serviceOperation, binding) => {
      calls.push({ name: serviceOperation.name.value, binding });
      let subject: RDF.Term = DF.variable('x');
      algebraUtils.visitOperation(serviceOperation.input, {
        [Algebra.Types.PATTERN]: { visitor: (patternOp) => {
          subject = patternOp.subject;
        } },
      });
      const subjects: RDF.NamedNode[] = subject.termType === 'Variable' ?
          [ EX('a'), EX('b') ] :
          [ <RDF.NamedNode> subject ];
      return subjects.map((subjectTerm) => {
        const entries: [RDF.Variable, RDF.Term][] = [
          [ DF.variable('w'), DF.literal(`w-${subjectTerm.value.split('/').pop()}`) ],
        ];
        if (subject.termType === 'Variable') {
          entries.push([ DF.variable('x'), subjectTerm ]);
        }
        return BF.bindings(entries);
      });
    };
  }

  async function queryRows(query: string, context: any): Promise<Record<string, string>[]> {
    const bindings = await (await engine.queryBindings(query, context)).toArray();
    return bindings
      .map(binding => Object.fromEntries([ ...binding ].map(([ key, value ]) => [ key.value, value.value ])))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }

  beforeEach(() => {
    engine = new QueryEngine();
    endpointQueries = [];
  });

  it('should evaluate a clause through the executor of its target', async() => {
    const calls: { name: string; binding: RDF.Bindings | undefined }[] = [];
    await expect(queryRows(`${PREFIX}SELECT ?x ?w WHERE {
      SERVICE <${SERVICE}> { ?x :w ?w }
    }`, { sources: [], serviceExecutors: { [SERVICE]: createSubjectExecutor(calls) }})).resolves.toEqual([
      { x: 'http://example.org/a', w: 'w-a' },
      { x: 'http://example.org/b', w: 'w-b' },
    ]);
    expect(calls).toEqual([{ name: SERVICE, binding: undefined }]);
  });

  it('should evaluate a clause through the executor with the bindings of the join', async() => {
    const calls: { name: string; binding: RDF.Bindings | undefined }[] = [];
    await expect(queryRows(`${PREFIX}SELECT ?x ?v ?w WHERE {
      ?x :val ?v .
      SERVICE <${SERVICE}> { ?x :w ?w }
    }`, { sources: [ createStore() ], serviceExecutors: { [SERVICE]: createSubjectExecutor(calls) }})).resolves.toEqual([
      { x: 'http://example.org/a', v: '1', w: 'w-a' },
      { x: 'http://example.org/b', v: '2', w: 'w-b' },
    ]);
    expect(calls).toHaveLength(2);
    expect(calls.map(call => call.binding?.get('x')?.value).sort((left, right) => left!.localeCompare(right!)))
      .toEqual([ 'http://example.org/a', 'http://example.org/b' ]);
  });

  it('should evaluate a clause through the executor when the rest of the query goes to a SPARQL endpoint', async() => {
    const calls: { name: string; binding: RDF.Bindings | undefined }[] = [];
    await expect(queryRows(`${PREFIX}SELECT ?x ?v ?w WHERE {
      ?x :val ?v .
      SERVICE <${SERVICE}> { ?x :w ?w }
    }`, {
      sources: [{ type: 'sparql', value: ENDPOINT }],
      fetch: mockedFetch,
      serviceExecutors: { [SERVICE]: createSubjectExecutor(calls) },
    })).resolves.toEqual([
      { x: 'http://example.org/a', v: '1', w: 'w-a' },
    ]);
    expect(calls).toHaveLength(1);
    expect(endpointQueries.length).toBeGreaterThan(0);
    for (const endpointQuery of endpointQueries) {
      expect(endpointQuery).not.toContain('SERVICE');
    }
  });

  it('should pass a clause to a SPARQL endpoint if no executor exists for its target', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?x ?v WHERE {
      ?x :val ?v .
      SERVICE <${SERVICE}> { ?x :w ?w }
    }`, {
      sources: [{ type: 'sparql', value: ENDPOINT }],
      fetch: mockedFetch,
      serviceExecutorCreator: () => undefined,
    })).resolves.toEqual([
      { x: 'http://example.org/a', v: '1' },
    ]);
    expect(endpointQueries).toHaveLength(1);
    expect(endpointQueries[0]).toContain('SERVICE');
  });

  it('should evaluate clauses with a variable target through executors from the creator', async() => {
    const createdServices: string[] = [];
    await expect(queryRows(`${PREFIX}SELECT ?value WHERE {
      VALUES ?service { <urn:my-app:add?x=5> <urn:my-app:add?x=10> }
      SERVICE ?service { <urn:s> <urn:p> ?value }
    }`, {
      sources: [],
      serviceAllowVariableTargets: true,
      serviceExecutorCreator: (serviceNamedNode: RDF.NamedNode) => {
        const url = new URL(serviceNamedNode.value);
        if (`${url.protocol}${url.pathname}` !== 'urn:my-app:add') {
          return undefined;
        }
        createdServices.push(serviceNamedNode.value);
        const x = Number(url.searchParams.get('x'));
        return async() => [ BF.bindings([[ DF.variable('value'), DF.literal(`${x + 1}`) ]]) ];
      },
    })).resolves.toEqual([
      { value: '11' },
      { value: '6' },
    ]);
    expect(createdServices.sort()).toEqual([ 'urn:my-app:add?x=10', 'urn:my-app:add?x=5' ]);
  });

  it('should evaluate a clause through an executor returning a bindings stream', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?value WHERE {
      SERVICE <${SERVICE}> { <urn:s> <urn:p> ?value }
    }`, {
      sources: [],
      serviceExecutors: {
        [SERVICE]: async() => new ArrayIterator(
          [ BF.bindings([[ DF.variable('value'), DF.literal('works') ]]) ],
          { autoStart: false },
        ),
      },
    })).resolves.toEqual([{ value: 'works' }]);
  });

  it('should propagate errors of the executor', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?value WHERE {
      SERVICE <${SERVICE}> { <urn:s> <urn:p> ?value }
    }`, {
      sources: [],
      serviceExecutors: {
        [SERVICE]: async() => {
          throw new Error('Executor failure');
        },
      },
    })).rejects.toThrow('Executor failure');
  });

  it('should replace errors of the executor by an empty solution in a silent clause', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?outer ?value WHERE {
      VALUES ?outer { "outer" }
      SERVICE SILENT <${SERVICE}> { <urn:s> <urn:p> ?value }
    }`, {
      sources: [],
      serviceExecutors: {
        [SERVICE]: async() => {
          throw new Error('Executor failure');
        },
      },
    })).resolves.toEqual([{ outer: 'outer' }]);
  });

  it('should not allow executors and an executor creator at the same time', async() => {
    await expect(queryRows(`${PREFIX}SELECT ?value WHERE {
      SERVICE <${SERVICE}> { <urn:s> <urn:p> ?value }
    }`, {
      sources: [],
      serviceExecutors: { [SERVICE]: async() => []},
      serviceExecutorCreator: () => undefined,
    })).rejects.toThrow('Illegal simultaneous usage of serviceExecutorCreator and serviceExecutors in context');
  });
});
