/** @jest-environment setup-polly-jest/jest-environment-node */

// Needed to undo automock from actor-http-native, cleaner workarounds do not appear to be working.
if (!global.window) {
  jest.unmock('follow-redirects');
}

import type { QueryBindings, QueryStringContext } from '@comunica/types';
import 'jest-rdf';
import arrayifyStream from 'arrayify-stream';
import { QueryEngine } from '../lib/QueryEngine';
import { usePolly } from './util';

const stringifyStream = require('stream-to-string');

describe('System test: QuerySparql', () => {
  usePolly();

  let engine: QueryEngine;
  beforeEach(() => {
    engine = new QueryEngine();
  });

  describe('query', () => {
    describe('simple SPO on a raw RDF document', () => {
      it('with results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(await result.execute())).length).toBeGreaterThan(100);
      });

      it('without results', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s <ex:dummy> ?o.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(await result.execute()))).toEqual([]);
      });

      it('for the single source context entry', async() => {
        const result = <QueryBindings> await engine.query(`SELECT * WHERE {
      ?s ?p ?o.
    }`, { sources: [ 'https://www.rubensworks.net/' ]});
        expect((await arrayifyStream(await result.execute())).length).toBeGreaterThan(100);
      });

      it('repeated with the same engine', async() => {
        const query = `SELECT * WHERE {
      ?s ?p ?o.
    }`;
        const context: QueryStringContext = { sources: [ 'https://www.rubensworks.net/' ]};
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
        expect((await arrayifyStream(await (<QueryBindings> await engine.query(query, context)).execute()))
          .length).toBeGreaterThan(100);
      });
    });
  });

  it('handles the query with SHACL copact syntax as a source', async() => {
    const result = <QueryBindings> await engine.query(`SELECT * WHERE {
    ?s a <http://www.w3.org/2002/07/owl#Ontology>.
  }`, { sources: [
      'https://raw.githubusercontent.com/w3c/data-shapes/gh-pages/shacl-compact-syntax/' +
          'tests/valid/basic-shape-iri.shaclc',
    ]});
    expect((await arrayifyStream(await result.execute())).length).toEqual(1);
  });

  it('correctly serializes construct query on a shape in .shaclc as shaclc', async() => {
    const result = <QueryBindings> await engine.query(`CONSTRUCT WHERE {
    ?s ?p ?o
  }`, { sources: [
      'https://raw.githubusercontent.com/w3c/data-shapes/gh-pages/shacl-compact-syntax/' +
          'tests/valid/basic-shape-iri.shaclc',
    ]});

    const { data } = await engine.resultToString(result,
      'text/shaclc');

    expect((await stringifyStream(data))).toEqual('BASE <http://example.org/basic-shape-iri>\n\n' +
    'shape <http://example.org/test#TestShape> {\n' +
    '}\n');
  });

  it('correctly serializes construct query on a shape in .ttl as shaclc', async() => {
    const result = <QueryBindings> await engine.query(`CONSTRUCT WHERE {
    ?s ?p ?o
  }`, { sources: [
      'https://raw.githubusercontent.com/w3c/data-shapes/gh-pages/shacl-compact-syntax/' +
          'tests/valid/basic-shape-iri.ttl',
    ]});

    const { data } = await engine.resultToString(result,
      'text/shaclc');

    expect((await stringifyStream(data))).toEqual('BASE <http://example.org/basic-shape-iri>\n\n' +
    'shape <http://example.org/test#TestShape> {\n' +
    '}\n');
  });
});
