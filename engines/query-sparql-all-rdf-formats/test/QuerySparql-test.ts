/** @jest-environment setup-polly-jest/jest-environment-node */

// Needed to undo automock from actor-http-native, cleaner workarounds do not appear to be working.
if (!global.window) {
  jest.unmock('follow-redirects');
}

import type { QueryBindings, QueryStringContext } from '@comunica/types';
import 'jest-rdf';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import { QueryEngine } from '../lib/QueryEngine';
import { usePolly } from './util';

const DF = new DataFactory();
const factory = new Factory();

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

  // TODO: re-enable this once blocking error is fixed
  // describe('SHACL compact syntax [parseNonRecommendedFormats disabled]', () => {
  //   it('errors when parseNonRecommendedFormats is not enabled', async() => {
  //     const result = (new QueryEngine()).query(`SELECT * WHERE {
  //   ?s a <http://www.w3.org/2002/07/owl#Ontology>.
  // }`, {
  //       sources: [
  //         'https://raw.githubusercontent.com/w3c/data-shapes/gh-pages/shacl-compact-syntax/' +
  //           'tests/valid/basic-shape-iri.shaclc',
  //       ],
  //     });
  //     await expect(result).rejects.toThrowError();
  //   });
  // });

  describe('SHACL compact syntax [parseNonRecommendedFormats enabled]', () => {
    it('handles the query when parseNonRecommendedFormats is enabled', async() => {
      const result = <QueryBindings> await engine.query(`SELECT * WHERE {
    ?s a <http://www.w3.org/2002/07/owl#Ontology>.
  }`, { sources: [
        'https://raw.githubusercontent.com/w3c/data-shapes/gh-pages/shacl-compact-syntax/' +
          'tests/valid/basic-shape-iri.shaclc',
      ],
      parseNonRecommendedFormats: true });
      expect((await arrayifyStream(await result.execute())).length).toEqual(1);
    });
  });
});
