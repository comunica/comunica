import type { QueryStringContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import 'jest-rdf';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import { QueryEngineFactory } from '../lib/QueryEngineFactory';

// Use an increased timeout
jest.setTimeout(30_000);

const DF = new DataFactory();
const queryEngineFactory = new QueryEngineFactory();

describe('Query with engine from QueryEngineFactory', () => {
  const query = 'CONSTRUCT WHERE { ?s ?p ?o }';

  it('should return the valid result with a turtle data source', async() => {
    const value = '<ex:s> <ex:p> <ex:o>. <ex:s> <ex:p2> <ex:o2>.';
    const context: QueryStringContext = { sources: [
      { type: 'stringSource',
        value,
        mediaType: 'text/turtle',
        baseIRI: 'http://example.org/' },
    ]};

    const expectedResult: RDF.Quad[] = [
      DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p'), DF.namedNode('ex:o')),
      DF.quad(DF.namedNode('ex:s'), DF.namedNode('ex:p2'), DF.namedNode('ex:o2')),
    ];

    const engine = await queryEngineFactory.create();

    const result = await arrayifyStream(await engine.queryQuads(query, context));
    expect(result.length).toBe(expectedResult.length);
    expect(result).toMatchObject(expectedResult);
  });
});
