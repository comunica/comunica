/** @jest-environment setup-polly-jest/jest-environment-node */

// Needed to undo automock from actor-http-native, cleaner workarounds do not appear to be working.
if (!global.window) {
  jest.unmock('follow-redirects');
}

import 'jest-rdf';
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
  // TODO: re-enable this once blocking error is fixed
    describe('SHACL compact syntax [parseNonRecommendedFormats disabled]', () => {
      it('errors when parseNonRecommendedFormats is not enabled', async() => {
        const result = (new QueryEngine()).query(`SELECT * WHERE {
    ?s a <http://www.w3.org/2002/07/owl#Ontology>.
  }`, {
          sources: [
            'https://raw.githubusercontent.com/w3c/data-shapes/gh-pages/shacl-compact-syntax/' +
            'tests/valid/basic-shape-iri.shaclc',
          ],
        });
        await expect(result).rejects.toThrowError();
      });
    });
  });
});
