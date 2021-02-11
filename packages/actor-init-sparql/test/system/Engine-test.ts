// Needed to undo automock from actor-http-native, cleaner workarounds do not appear to be working.
jest.unmock('follow-redirects');

import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import type { ActorInitSparql, IQueryResultUpdate } from '../../index-browser';
import { newEngine } from '../../index-browser';
import type { IQueryResultBindings } from '../../lib/ActorInitSparql-browser';
import { mockHttp } from './util';
import 'jest-rdf';
const arrayifyStream = require('arrayify-stream');

const DF = new DataFactory();

describe('System test: ActorInitSparql', () => {
  const pollyContext = mockHttp();

  let engine: ActorInitSparql;

  beforeEach(() => {
    engine = newEngine();
    pollyContext.polly.server.any().on('beforePersist', (req, recording) => {
      recording.request.headers = recording.request.headers.filter(({ name }: any) => name !== 'user-agent');
    });
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

        // Check results
        await result.updateResult;
        expect((await arrayifyStream(result.quadStreamInserted))).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
        ]);
        expect(result.quadStreamDeleted).toBeUndefined();

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

        // Check results
        await result.updateResult;
        expect((await arrayifyStream(result.quadStreamInserted))).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
        ]);
        expect((await arrayifyStream(result.quadStreamDeleted))).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('ex:s-pre'), DF.namedNode('ex:p-pre'), DF.namedNode('ex:o-pre')),
        ]);

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

        // Check results
        await result.updateResult;
        expect(result.quadStreamInserted).toBeUndefined();
        expect((await arrayifyStream(result.quadStreamDeleted))).toEqualRdfQuadArray([
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p1'), DF.namedNode('ex:o1')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
          DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p3'), DF.namedNode('ex:o3')),
        ]);

        // Check store contents
        expect(store.size).toEqual(1);
        expect(store.countQuads(DF.namedNode('ex:s2'), DF.namedNode('ex:p4'), DF.namedNode('ex:o4'), DF.defaultGraph()))
          .toEqual(1);
      });
    });
  });
});
