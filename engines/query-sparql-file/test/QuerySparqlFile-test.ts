/** @jest-environment setup-polly-jest/jest-environment-node */

import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
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

    describe('SERVICE clauses targeting files', () => {
      let source: string;
      let serviceTarget: string;
      let query: string;

      beforeEach(() => {
        source = path.join(path.relative(process.cwd(), __dirname), 'assets/dummy.ttl');
        serviceTarget = pathToFileURL(path.join(__dirname, 'assets/dummy.jsonld')).href;
        query = `SELECT * WHERE { SERVICE <${serviceTarget}> { ?s ?p ?o. } }`;
      });

      it('should not be allowed by default', async() => {
        const context: QueryStringContext = { sources: [{ value: source }]};
        await expect(async() => arrayifyStream(await engine.queryBindings(query, context))).rejects
          .toThrow(`Dereferencing the local file '${serviceTarget}' is not allowed within this scope.`);
      });

      it('should produce no results by default when silent', async() => {
        const querySilent = `SELECT * WHERE { SERVICE SILENT <${serviceTarget}> { ?s ?p ?o. } }`;
        const context: QueryStringContext = { sources: [{ value: source }]};
        await expect(arrayifyStream(await engine.queryBindings(querySilent, context))).resolves.toHaveLength(0);
      });

      it('should be allowed with serviceAllowFileTargets', async() => {
        const context: QueryStringContext = { sources: [{ value: source }], serviceAllowFileTargets: true };
        await expect(arrayifyStream(await engine.queryBindings(query, context))).resolves.toHaveLength(2);
      });

      it('should not block file sources that are passed as query sources', async() => {
        const queryCombined = `SELECT * WHERE {
          ?s ?p ?o.
          OPTIONAL { SERVICE SILENT <${serviceTarget}> { ?s2 ?p2 ?o2. } }
        }`;
        const context: QueryStringContext = { sources: [{ value: source }]};
        await expect(arrayifyStream(await engine.queryBindings(queryCombined, context))).resolves.toHaveLength(5);
      });
    });
  });
});
