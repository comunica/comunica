/* eslint-disable jest/no-mocks-import */
import { PassThrough } from 'node:stream';
import type { BindingsStream } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Readable } from 'readable-stream';

// @ts-expect-error
import { QueryEngineFactoryBase } from '../__mocks__';

// @ts-expect-error
import { ServerResponseMock } from '../__mocks__/http';

import { VoidMetadataEmitter } from '../lib/VoidMetadataEmitter';

const quad = require('rdf-quad');

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

// Urls
const s = '/sparql';
const xsd = 'http://www.w3.org/2001/XMLSchema#';
const sd = 'http://www.w3.org/ns/sparql-service-description#';
const vd = 'http://rdfs.org/ns/void#';
const rdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const rdfType = `${rdf}type`;
const vocabulary = `${vd}vocabulary`;
const dcterms = 'http://purl.org/dc/terms/';

describe('VoidMetadataEmitter', () => {
  let emitter: VoidMetadataEmitter;
  let request: any;
  let response: any;
  let endCalledPromise: any;
  let queryBindings: (query: string) => BindingsStream;

  beforeEach(() => {
    emitter = new VoidMetadataEmitter({
      dcterms: {
        title: 'title',
        description: 'description',
        creator: 'http://example.org/creator',
        created: '2025-08-07',
      },
    });
    emitter.invalidateCache();
    request = Readable.from([ 'content' ]);
    request.url = '/sparql';
    request.headers = { host: 'localhost:3000' };
    response = new ServerResponseMock();
    endCalledPromise = new Promise(resolve => response.onEnd = resolve);
    queryBindings = (query: string): BindingsStream => {
      let bindingsArray: RDF.Bindings[];
      if (query.includes('?triples')) {
        bindingsArray = [
          BF.bindings([
            [ DF.variable('triples'), DF.literal('8', DF.namedNode(`${xsd}integer`)) ],
            [ DF.variable('entities'), DF.literal('8', DF.namedNode(`${xsd}integer`)) ],
            [ DF.variable('distinctSubjects'), DF.literal('8', DF.namedNode(`${xsd}integer`)) ],
            [ DF.variable('properties'), DF.literal('5', DF.namedNode(`${xsd}integer`)) ],
            [ DF.variable('distinctObjects'), DF.literal('4', DF.namedNode(`${xsd}integer`)) ],
          ]),
        ];
      } else if (query.includes('?classes')) {
        bindingsArray = [
          BF.bindings([
            [ DF.variable('classes'), DF.literal('2', DF.namedNode(`${xsd}integer`)) ],
          ]),
        ];
      } else if (query.includes('?class ')) {
        bindingsArray = [
          BF.bindings([
            [ DF.variable('class'), DF.namedNode('http://example.org/classA') ],
            [ DF.variable('count'), DF.literal('5', DF.namedNode(`${xsd}integer`)) ],
          ]),
          BF.bindings([
            [ DF.variable('class'), DF.namedNode('http://example.org/classB') ],
            [ DF.variable('count'), DF.literal('3', DF.namedNode(`${xsd}integer`)) ],
          ]),
        ];
      } else {
        bindingsArray = [
          BF.bindings([
            [ DF.variable('property'), DF.namedNode('http://example.org/propertyA') ],
            [ DF.variable('count'), DF.literal('3', DF.namedNode(`${xsd}integer`)) ],
          ]),
          BF.bindings([
            [ DF.variable('property'), DF.namedNode('http://example.org/propertyB') ],
            [ DF.variable('count'), DF.literal('2', DF.namedNode(`${xsd}integer`)) ],
          ]),
        ];
      }
      return <BindingsStream>(new ArrayIterator<RDF.Bindings>(bindingsArray));
    };
  });

  it('invalidateCache', () => {
    emitter.cachedStatistics = [ quad('http://example.org/s', 'http://example.org/p', '"o"') ];
    expect(emitter.cachedStatistics).toHaveLength(1);
    emitter.invalidateCache();
    expect(emitter.cachedStatistics).toHaveLength(0);
  });

  it('getVoidQuads should output the correct quads', async() => {
    // Create spies
    const engine = await new QueryEngineFactoryBase().create();
    engine.queryBindings = queryBindings;

    // Invoke writeQueryResult
    const quads = await emitter.getVoIDQuads(
      engine,
      new PassThrough(),
      request,
      response,
    );

    // Check output
    const dataset = '_:defaultDataset';
    const graph = '_:defaultGraph';
    const classPartition0 = '_:classPartition0';
    const classPartition1 = '_:classPartition1';
    const propertyPartition0 = '_:propertyPartition0';
    const propertyPartition1 = '_:propertyPartition1';
    const expectedQuads = [
      quad(s, `${sd}defaultDataset`, dataset),
      quad(dataset, rdfType, `${sd}Dataset`),
      quad(dataset, rdfType, `${vd}Dataset`),
      quad(dataset, `${vd}sparqlEndpoint`, s),
      quad(dataset, vocabulary, dcterms),
      quad(dataset, `${dcterms}title`, '"title"'),
      quad(dataset, `${dcterms}description`, '"description"'),
      quad(dataset, `${dcterms}creator`, 'http://example.org/creator'),
      quad(dataset, `${dcterms}created`, `"2025-08-07"^^${xsd}date`),

      quad(dataset, `${sd}defaultGraph`, graph),
      quad(graph, rdfType, `${sd}Graph`),
      quad(graph, `${vd}triples`, `"8"^^${xsd}integer`),
      quad(graph, `${vd}entities`, `"8"^^${xsd}integer`),
      quad(graph, `${vd}distinctSubjects`, `"8"^^${xsd}integer`),
      quad(graph, `${vd}properties`, `"5"^^${xsd}integer`),
      quad(graph, `${vd}distinctObjects`, `"4"^^${xsd}integer`),
      quad(graph, `${vd}classes`, `"2"^^${xsd}integer`),

      quad(dataset, `${vd}classPartition`, classPartition0),
      quad(classPartition0, rdfType, `${vd}ClassPartition`),
      quad(classPartition0, `${vd}class`, 'http://example.org/classA'),
      quad(classPartition0, `${vd}entities`, `"5"^^${xsd}integer`),

      quad(dataset, `${vd}propertyPartition`, propertyPartition0),
      quad(propertyPartition0, rdfType, `${vd}PropertyPartition`),
      quad(propertyPartition0, `${vd}property`, 'http://example.org/propertyA'),
      quad(propertyPartition0, `${vd}triples`, `"3"^^${xsd}integer`),

      quad(dataset, `${vd}classPartition`, classPartition1),
      quad(classPartition1, rdfType, `${vd}ClassPartition`),
      quad(classPartition1, `${vd}class`, 'http://example.org/classB'),
      quad(classPartition1, `${vd}entities`, `"3"^^${xsd}integer`),

      quad(dataset, `${vd}propertyPartition`, propertyPartition1),
      quad(propertyPartition1, rdfType, `${vd}PropertyPartition`),
      quad(propertyPartition1, `${vd}property`, 'http://example.org/propertyB'),
      quad(propertyPartition1, `${vd}triples`, `"2"^^${xsd}integer`),
    ];
    expect(quads).toEqual(expectedQuads);
  });

  it('should only query statistics once when doing multiple VoID description requests', async() => {
    // Create spies
    const engine = await new QueryEngineFactoryBase().create();
    engine.queryBindings = queryBindings;
    const spyQueryBindings = jest.spyOn(engine, 'queryBindings');

    // Request VoID description twice
    await emitter.getVoIDQuads(
      engine,
      new PassThrough(),
      request,
      response,
    );
    await emitter.getVoIDQuads(
      engine,
      new PassThrough(),
      request,
      response,
    );

    // Each statistics query does 4 calls, so 4 in total since the 2nd one used the cached statistics
    expect(spyQueryBindings).toHaveBeenCalledTimes(4);
  });

  it('should handle errors in VoID description statistics query', async() => {
    // Create spies
    const engine = await new QueryEngineFactoryBase().create();
    engine.queryBindings = (): BindingsStream => <BindingsStream>(new ArrayIterator<RDF.Bindings>([ BF.bindings([
      [ DF.variable('error'), DF.literal('error') ],
    ]) ]));
    const spyGetVoIDQuads = jest.spyOn(emitter, 'getVoIDQuads');
    const spyQueryBindings = jest.spyOn(engine, 'queryBindings');

    await emitter.getVoIDQuads(
      engine,
      new PassThrough(),
      request,
      response,
    );

    // Check if the VD logic has been called
    expect(spyGetVoIDQuads).toHaveBeenCalledTimes(1);
    expect(spyQueryBindings).toHaveBeenCalledTimes(4);

    await expect(endCalledPromise).resolves.toBe('An internal server error occurred.\n');
  });
});
