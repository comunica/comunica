// Needed to undo automock from actor-http-native, cleaner workarounds do not appear to be working.
jest.unmock('follow-redirects');

import type { ActorInitSparql } from '../../index-browser';
import { newEngine } from '../../index-browser';
import type { IQueryResultBindings } from '../../lib/ActorInitSparql-browser';
import { mockHttp } from './util';
const arrayifyStream = require('arrayify-stream');

describe('System test: ActorInitSparql', () => {
  mockHttp();

  let engine: ActorInitSparql;

  beforeEach(() => {
    engine = newEngine();
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
