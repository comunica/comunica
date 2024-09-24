/** @jest-environment setup-polly-jest/jest-environment-node */

import * as path from 'node:path';
import type { QueryStringContext } from '@comunica/types';
import 'jest-rdf';
import arrayifyStream from 'arrayify-stream';
import { QueryEngine } from '../lib/QueryEngine';

describe('System test: QuerySparqlFile', () => {
  let engine: QueryEngine;

  beforeEach(() => {
    engine = new QueryEngine();
  });

  describe('query', () => {
    describe('simple SPO on a raw RDF document', () => {
      const p = path.join(path.relative(process.cwd(), __dirname), 'assets/dummy.jsonld');
      const query = `SELECT * WHERE { ?s ?p ?o. }`;

      it('should return a result for a jsonld file by a relative file path', async() => {
        const context: QueryStringContext = { sources: [{ value: p }]};

        const result = await arrayifyStream(await engine.queryBindings(query, context));
        expect(result).toHaveLength(2);
      });
    });
  });
});
