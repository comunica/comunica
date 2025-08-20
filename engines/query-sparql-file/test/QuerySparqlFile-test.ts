/** @jest-environment setup-polly-jest/jest-environment-node */

import * as path from 'node:path';
import type { QueryStringContext } from '@comunica/types';
import 'jest-rdf';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import '@comunica/utils-jest';
import { QueryEngine } from '../lib/QueryEngine';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('System test: QuerySparqlFile', () => {
  let engine: QueryEngine;

  beforeEach(() => {
    engine = new QueryEngine();
  });

  describe('query', () => {
    describe('simple SPO on a raw RDF document', () => {
      it('should return a result for a jsonld file by a relative file path', async() => {
        const p = path.join(path.relative(process.cwd(), __dirname), 'assets/dummy.jsonld');
        const query = `SELECT * WHERE { ?s ?p ?o. }`;
        const context: QueryStringContext = { sources: [{ value: p }]};

        const result = await arrayifyStream(await engine.queryBindings(query, context));
        expect(result).toHaveLength(2);
      });

      it('should return a result for a ttl file by a relative file path using fileBaseIRI', async() => {
        const p = path.join(path.relative(process.cwd(), __dirname), 'assets/dummy.ttl');
        const query = `
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?person ?name
WHERE {
  <data/Alice> foaf:knows ?person .
  ?person a <data/Person> ;
          foaf:name ?name .
}
        `;
        const baseIRI = 'http://example.org/';
        const fileBaseIRI = 'http://example.org/data/';
        const context: QueryStringContext = { sources: [{ value: p }], baseIRI, fileBaseIRI };

        const expectedResult = [
          BF.bindings([
            [ DF.variable('name'), DF.literal('Bob', DF.namedNode('http://www.w3.org/2001/XMLSchema#string')) ],
            [ DF.variable('person'), DF.namedNode(`${fileBaseIRI}Bob`) ],
          ]),
        ];

        const result = await arrayifyStream(await engine.queryBindings(query, context));
        expect(result).toEqualBindingsArray(expectedResult);
      });
    });
  });
});
