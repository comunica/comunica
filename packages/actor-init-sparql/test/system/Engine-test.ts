/** @jest-environment setup-polly-jest/jest-environment-node */

// Needed to undo automock from actor-http-native, cleaner workarounds do not appear to be working.

import type { IQueryExplained } from '@comunica/types';

jest.unmock('follow-redirects');

import type * as RDF from '@rdfjs/types';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import type { IQueryResultBindings } from '../../lib/ActorInitSparql-browser';
import type { ActorInitSparql, IQueryResultUpdate } from '../../lib/index-browser';
import { newEngine } from '../../lib/index-browser';
import { mockHttp } from './util';
import 'jest-rdf';
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();
const factory = new Factory();

describe('System test: ActorInitSparql', () => {
  const pollyContext = mockHttp();

  let engine: ActorInitSparql;

  beforeEach(() => {
    engine = newEngine();
    pollyContext.polly.server.any().on('beforePersist', (req, recording) => {
      recording.request.headers = recording.request.headers.filter(({ name }: any) => name !== 'user-agent');
    });
  });

  afterEach(async() => {
    await pollyContext.polly.flush();
  });

  describe('query', () => {
    describe('simple SPO on a raw RDF document', () => {
      it('with results', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(result.bindingsStream)).length).toBeGreaterThan(100);
      });

      it('without results', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT * WHERE {
      ?s <ex:dummy> ?o.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(result.bindingsStream))).toEqual([]);
      });

      it('for the single source context entry', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    }`, { source: 'https://www.rubensworks.net/' });
        expect((await arrayifyStream(result.bindingsStream)).length).toBeGreaterThan(100);
      });

      it('repeated with the same engine', async() => {
        const query = `SELECT * WHERE {
      ?s ?p ?o.
    }`;
        const context = { sources: [ 'https://www.rubensworks.net/' ]};
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream))
          .length).toBeGreaterThan(100);
      });

      it('repeated with the same engine without results', async() => {
        const query = `SELECT * WHERE {
      ?s <ex:dummy> ?o.
    }`;
        const context = { sources: [ 'https://www.rubensworks.net/' ]};
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream)))
          .toEqual([]);
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream)))
          .toEqual([]);
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream)))
          .toEqual([]);
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream)))
          .toEqual([]);
        expect((await arrayifyStream((<IQueryResultBindings> await engine.query(query, context)).bindingsStream)))
          .toEqual([]);
      });

      describe('extension function', () => {
        let funcAllow: string;
        let store: Store;
        let baseFunctions: Record<string, (args: RDF.Term[]) => Promise<RDF.Term>>;
        let baseFunctionCreator: (functionName: RDF.NamedNode) => ((args: RDF.Term[]) => Promise<RDF.Term>) | undefined;
        let quads: RDF.Quad[];
        let stringType: RDF.NamedNode;
        let booleanType: RDF.NamedNode;
        let integerType: RDF.NamedNode;
        beforeEach(() => {
          stringType = DF.namedNode('http://www.w3.org/2001/XMLSchema#string');
          booleanType = DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean');
          integerType = DF.namedNode('http://www.w3.org/2001/XMLSchema#integer');
          funcAllow = 'allowAll';
          baseFunctions = {
            'http://example.org/functions#allowAll': async(args: RDF.Term[]) => DF.literal('true', booleanType),
          };
          baseFunctionCreator = (functionName: RDF.NamedNode) =>
            async(args: RDF.Term[]) => DF.literal('true', booleanType);
          store = new Store();
          quads = [
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:p1'), DF.literal('apple', stringType)),
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:p2'), DF.literal('APPLE', stringType)),
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:p3'), DF.literal('Apple', stringType)),
            DF.quad(DF.namedNode('ex:a'), DF.namedNode('ex:p4'), DF.literal('aPPLE', stringType)),
          ];
          store.addQuads(quads);
        });
        const baseQuery = (funcName: string) => `PREFIX func: <http://example.org/functions#>
        SELECT * WHERE {
              ?s ?p ?o.
            FILTER (func:${funcName}(?o))
        }`;

        it('rejects when record does not match', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctions = baseFunctions;
          await expect(engine.query(baseQuery('nonExist'), context)).rejects.toThrow('Unknown named operator');
        });

        it('rejects when creator returns null', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctionCreator = () => null;
          await expect(engine.query(baseQuery('nonExist'), context)).rejects.toThrow('Unknown named operator');
        });

        it('with results and pointless custom filter given by creator', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctionCreator = baseFunctionCreator;
          const result = <IQueryResultBindings> await engine.query(baseQuery(funcAllow), context);
          expect((await arrayifyStream(result.bindingsStream)).length).toEqual(store.size);
        });

        it('with results and pointless custom filter given by record', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctions = baseFunctions;
          const result = <IQueryResultBindings> await engine.query(baseQuery(funcAllow), context);
          expect((await arrayifyStream(result.bindingsStream)).length).toEqual(4);
        });

        it('with results but all filtered away', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctionCreator = () => () =>
            DF.literal('false', booleanType);
          const result = <IQueryResultBindings> await engine.query(baseQuery('rejectAll'), context);
          expect(await arrayifyStream(result.bindingsStream)).toEqual([]);
        });

        it('throws error when supplying both record and creator', async() => {
          const context = <any> { sources: [ store ]};
          context.extensionFunctions = baseFunctions;
          context.extensionFunctionCreator = baseFunctionCreator;
          await expect(engine.query(baseQuery(funcAllow), context)).rejects
            .toThrow('Illegal simultaneous usage of extensionFunctionCreator and extensionFunctions in context');
        });

        it('handles complex queries with BIND to', async() => {
          const context = <any> { sources: [ store ]};
          const complexQuery = `PREFIX func: <http://example.org/functions#>
        SELECT ?caps WHERE {
              ?s ?p ?o.
              BIND (func:to-upper-case(?o) AS ?caps)
        }
          `;
          context.extensionFunctions = {
            async 'http://example.org/functions#to-upper-case'(args: RDF.Term[]) {
              const arg = args[0];
              if (arg.termType === 'Literal' && arg.datatype.equals(DF.literal('', stringType).datatype)) {
                return DF.literal(arg.value.toUpperCase(), stringType);
              }
              return arg;
            },
          };
          const result = <IQueryResultBindings> await engine.query(complexQuery, context);
          expect((await result.bindings()).map(res => res.get('?caps').value)).toEqual(
            quads.map(q => q.object.value.toUpperCase()),
          );
        });

        describe('handles complex queries with groupBy', () => {
          let context: any;
          let complexQuery: string;
          let extensionBuilder: (timout: boolean) => (args: RDF.Term[]) => Promise<RDF.Term>;

          beforeEach(() => {
            context = <any> { sources: [ store ]};
            complexQuery = `PREFIX func: <http://example.org/functions#>
        SELECT (SUM(func:count-chars(?o)) AS ?sum) WHERE {
              ?s ?p ?o.
        }
          `;
            extensionBuilder = (timout: boolean) => async(args: RDF.Term[]) => {
              const arg = args[0];
              if (arg.termType === 'Literal' && arg.datatype.equals(DF.literal('', stringType).datatype)) {
                if (timout) {
                  await new Promise(resolve => setTimeout(resolve, 1));
                }
                return DF.literal(String(arg.value.length), integerType);
              }
              return arg;
            };
          });

          it('can be evaluated', async() => {
            context.extensionFunctions = {
              'http://example.org/functions#count-chars': extensionBuilder(false),
            };
            const result = <IQueryResultBindings> await engine.query(complexQuery, context);
            expect((await result.bindings()).map(res => res.get('?sum').value)).toEqual([ '20' ]);
          });

          it('can be truly async', async() => {
            context.extensionFunctions = {
              'http://example.org/functions#count-chars': extensionBuilder(true),
            };
            const result = <IQueryResultBindings> await engine.query(complexQuery, context);
            expect((await result.bindings()).map(res => res.get('?sum').value)).toEqual([ '20' ]);
          });
        });
      });
    });

    describe('two-pattern query on a raw RDF document', () => {
      it('with results', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT ?name WHERE {
  <https://www.rubensworks.net/#me> <http://xmlns.com/foaf/0.1/knows> ?v0.
  ?v0 <http://xmlns.com/foaf/0.1/name> ?name.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(result.bindingsStream)).length).toBeGreaterThan(20);
      });

      it('without results', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT ?name WHERE {
  <https://www.rubensworks.net/#me> <http://xmlns.com/foaf/0.1/knows> ?v0.
  ?v0 <ex:dummy> ?name.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(result.bindingsStream))).toEqual([]);
      });

      it('for the single source entry', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT ?name WHERE {
  <https://www.rubensworks.net/#me> <http://xmlns.com/foaf/0.1/knows> ?v0.
  ?v0 <http://xmlns.com/foaf/0.1/name> ?name.
    }`, { source: 'https://www.rubensworks.net/' });
        expect((await arrayifyStream(result.bindingsStream)).length).toBeGreaterThan(20);
      });
    });

    describe('simple SPO on a TPF entrypoint', () => {
      it('with results', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    } LIMIT 300`, { sources: [ 'https://fragments.dbpedia.org/2016-04/en' ]});
        expect((await arrayifyStream(result.bindingsStream)).length).toEqual(300);
      });

      it('with filtered results', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT * WHERE {
      ?s a ?o.
    } LIMIT 300`, { sources: [ 'https://fragments.dbpedia.org/2016-04/en' ]});
        expect((await arrayifyStream(result.bindingsStream)).length).toEqual(300);
      });
    });

    describe('two-pattern query on a TPF entrypoint', () => {
      it('with results', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT * WHERE {
      ?city a <http://dbpedia.org/ontology/Airport>;
            <http://dbpedia.org/property/cityServed> <http://dbpedia.org/resource/Italy>.
    }`, { sources: [ 'https://fragments.dbpedia.org/2016-04/en' ]});
        expect((await arrayifyStream(result.bindingsStream)).length).toEqual(19);
      });

      it('without results', async() => {
        const result = <IQueryResultBindings> await engine.query(`SELECT * WHERE {
      ?city a <http://dbpedia.org/ontology/Airport>;
            <http://dbpedia.org/property/cityServed> <http://dbpedia.org/resource/UNKNOWN>.
    }`, { sources: [ 'https://fragments.dbpedia.org/2016-04/en' ]});
        expect((await arrayifyStream(result.bindingsStream))).toEqual([]);
      });
    });
  });

  describe('update', () => {
    describe('without sources on destination RDFJS Store', () => {
      it('with direct insert', async() => {
        // Prepare store
        const store = new Store();

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(`INSERT DATA {
      <ex:s> <ex:p> <ex:o>.
    }`, {
          sources: [],
          destination: store,
        });
        await result.updateResult;

        // Check store contents
        expect(store.size).toEqual(1);
        expect(store.countQuads(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()))
          .toEqual(1);
      });

      it('with direct insert on a single source', async() => {
        // Prepare store
        const store = new Store();

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(`INSERT DATA {
      <ex:s> <ex:p> <ex:o>.
    }`, {
          sources: [ store ],
        });
        await result.updateResult;

        // Check store contents
        expect(store.size).toEqual(1);
        expect(store.countQuads(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()))
          .toEqual(1);
      });

      it('with direct insert and delete', async() => {
        // Prepare store
        const store = new Store();
        store.addQuad(DF.quad(DF.namedNode('ex:s-pre'), DF.namedNode('ex:p-pre'), DF.namedNode('ex:o-pre')));

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(`INSERT DATA {
      <ex:s> <ex:p> <ex:o>.
    };
    DELETE DATA {
      <ex:s-pre> <ex:p-pre> <ex:o-pre>.
    }`, {
          sources: [],
          destination: store,
        });
        await result.updateResult;

        // Check store contents
        expect(store.size).toEqual(1);
        expect(store.countQuads(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o'), DF.defaultGraph()))
          .toEqual(1);
        expect(store
          .countQuads(DF.namedNode('ex:s-pre'), DF.namedNode('ex:p-pre'), DF.namedNode('ex:o-pre'), DF.defaultGraph()))
          .toEqual(0);
      });

      it('with variable delete', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4')),
        ]);
        expect(store.size).toEqual(4);

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(`DELETE WHERE {
      <ex:s> ?p ?o.
    }`, {
          sources: [ store ],
          destination: store,
        });
        await result.updateResult;

        // Check store contents
        expect(store.size).toEqual(1);
        expect(store.countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()))
          .toEqual(1);
      });

      it('with load', async() => {
        // Prepare store
        const store = new Store();

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(
          `LOAD <https://www.rubensworks.net/> INTO GRAPH <ex:graph>`,
          {
            sources: [],
            destination: store,
          },
        );
        await result.updateResult;

        // Check store contents
        expect(store.size > 0).toBeTruthy();
      });

      it('with clear', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3'), DF.namedNode('ex:g3')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()),
        ]);
        expect(store.size).toEqual(4);

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(`CLEAR NAMED`, {
          sources: [ store ],
          destination: store,
        });
        await result.updateResult;

        // Check store contents
        expect(store.size).toEqual(1);
        expect(store.countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()))
          .toEqual(1);
      });

      it('with drop', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g2')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3'), DF.namedNode('ex:g3')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()),
        ]);
        expect(store.size).toEqual(4);

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(`DROP DEFAULT`, {
          sources: [ store ],
          destination: store,
        });
        await result.updateResult;

        // Check store contents
        expect(store.size).toEqual(3);
        expect(store.countQuads(DF.namedNode('ex:s4'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()))
          .toEqual(0);
      });

      it('with create', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()),
        ]);
        expect(store.size).toEqual(2);

        // Resolve for non-existing graph
        await expect((<IQueryResultUpdate> await engine.query(`CREATE GRAPH <ex:g2>`, {
          sources: [ store ],
          destination: store,
        })).updateResult).resolves.toBeUndefined();

        // Reject for existing graph
        await expect((<IQueryResultUpdate> await engine.query(`CREATE GRAPH <ex:g1>`, {
          sources: [ store ],
          destination: store,
        })).updateResult).rejects.toThrowError('Unable to create graph ex:g1 as it already exists');

        // Resolve for existing graph in silent mode
        await expect((<IQueryResultUpdate> await engine.query(`CREATE SILENT GRAPH <ex:g1>`, {
          sources: [ store ],
          destination: store,
        })).updateResult).resolves.toBeUndefined();
      });

      it('with add', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.defaultGraph()),
        ]);
        expect(store.size).toEqual(2);

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(`ADD DEFAULT TO <ex:g1>`, {
          sources: [ store ],
          destination: store,
        });
        await result.updateResult;

        // Check store contents
        expect(store.size).toEqual(3);
        expect(store
          .countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g1')))
          .toEqual(1);
      });

      it('with move', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.defaultGraph()),
        ]);
        expect(store.size).toEqual(2);

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(`MOVE DEFAULT TO <ex:g1>`, {
          sources: [ store ],
          destination: store,
        });
        await result.updateResult;

        // Check store contents
        expect(store.size).toEqual(1);
        expect(store
          .countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g1')))
          .toEqual(1);
      });

      it('with copy', async() => {
        // Prepare store
        const store = new Store();
        store.addQuads([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1'), DF.namedNode('ex:g1')),
          DF.quad(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.defaultGraph()),
        ]);
        expect(store.size).toEqual(2);

        // Execute query
        const result = <IQueryResultUpdate> await engine.query(`COPY DEFAULT TO <ex:g1>`, {
          sources: [ store ],
          destination: store,
        });
        await result.updateResult;

        // Check store contents
        expect(store.size).toEqual(2);
        expect(store
          .countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2'), DF.namedNode('ex:g1')))
          .toEqual(1);
      });
    });
  });

  describe('queryOrExplain', () => {
    describe('a simple SPO on a raw RDF document', () => {
      it('explaining parsing', async() => {
        const result = <IQueryExplained> await engine.queryOrExplain(`SELECT * WHERE {
      ?s ?p ?o.
    }`, {
          sources: [ 'https://www.rubensworks.net/' ],
          explain: 'parsed',
        });
        expect(result).toEqual({
          explain: true,
          type: 'parsed',
          data: {
            input: {
              patterns: [
                factory.createPattern(
                  DF.variable('s'),
                  DF.variable('p'),
                  DF.variable('o'),
                ),
              ],
              type: 'bgp',
            },
            type: 'project',
            variables: [
              DF.variable('s'),
              DF.variable('p'),
              DF.variable('o'),
            ],
          },
        });
      });

      it('explaining logical plan', async() => {
        const result = <IQueryExplained> await engine.queryOrExplain(`SELECT * WHERE {
      ?s ?p ?o.
    }`, {
          sources: [ 'https://www.rubensworks.net/' ],
          explain: 'logical',
        });
        expect(result).toEqual({
          explain: true,
          type: 'logical',
          data: {
            input: {
              input: [
                factory.createPattern(
                  DF.variable('s'),
                  DF.variable('p'),
                  DF.variable('o'),
                ),
              ],
              type: 'join',
            },
            type: 'project',
            variables: [
              DF.variable('s'),
              DF.variable('p'),
              DF.variable('o'),
            ],
          },
        });
      });

      it('explaining physical plan', async() => {
        const result = <IQueryExplained> await engine.queryOrExplain(`SELECT * WHERE {
      ?s ?p ?o.
    }`, {
          sources: [ 'https://www.rubensworks.net/' ],
          explain: 'physical',
        });
        expect(result).toEqual({
          explain: true,
          type: 'physical',
          data: {
            logical: 'project',
            variables: [ 's', 'p', 'o' ],
            children: [
              {
                logical: 'join',
                children: [
                  {
                    logical: 'pattern',
                    pattern: '?s ?p ?o',
                  },
                ],
              },
            ],
          },
        });
      });
    });
  });
});
