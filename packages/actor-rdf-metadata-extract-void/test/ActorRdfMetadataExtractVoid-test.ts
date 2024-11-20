import { ActorInitQuery } from '@comunica/actor-init-query';
import { Bus } from '@comunica/core';
import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'rdf-data-factory';
import { ActorRdfMetadataExtractVoid } from '../lib/ActorRdfMetadataExtractVoid';
import '@comunica/utils-jest';

const streamifyArray = require('streamify-array');

jest.mock('@comunica/actor-init-query');
jest.mock('@comunica/bus-rdf-metadata-extract');

const DF = new DataFactory();

describe('ActorRdfMetadataExtractVoid', () => {
  let bus: any;
  let actor: ActorRdfMetadataExtractVoid;
  let actorInitQuery: ActorInitQuery;

  beforeEach(() => {
    jest.resetAllMocks();
    bus = new Bus({ name: 'bus' });
    actorInitQuery = new ActorInitQuery(<any> {});
    actor = new ActorRdfMetadataExtractVoid({
      bus,
      name: 'actor',
      actorInitQuery,
      queryCacheSize: 1,
    });
    (<any>actor).queryEngine = {
      queryBindings: () => {
        throw new Error('queryBindings called without mocking');
      },
    };
  });

  describe('test', () => {
    it('should test', async() => {
      await expect(actor.test(<any> {})).resolves.toBeTruthy();
    });
  });

  describe('run', () => {
    it('should return collected datasets', async() => {
      jest.spyOn(actor, 'collectFromMetadata').mockResolvedValue(<any>'store');
      jest.spyOn(actor, 'getDatasets').mockResolvedValue([ <any>'dataset' ]);
      await expect(actor.run(<any>{})).resolves.toEqual({ metadata: { datasets: [ 'dataset' ]}});
    });

    it('should return empty metadata without datasets', async() => {
      jest.spyOn(actor, 'collectFromMetadata').mockResolvedValue(<any>'store');
      jest.spyOn(actor, 'getDatasets').mockResolvedValue([]);
      await expect(actor.run(<any>{})).resolves.toEqual({ metadata: {}});
    });
  });

  describe('collectFromMetadata', () => {
    it('should collect only relevant quads', async() => {
      const stream = streamifyArray([
        DF.quad(DF.blankNode(), DF.namedNode(`${ActorRdfMetadataExtractVoid.VOID}triples`), DF.literal('0')),
        DF.quad(DF.blankNode(), DF.namedNode(`${ActorRdfMetadataExtractVoid.SPARQL_SD}feature`), DF.literal('f')),
        DF.quad(DF.blankNode(), DF.namedNode('ex:p'), DF.literal('o')),
      ]);
      const store = await actor.collectFromMetadata(stream);
      const output = await arrayifyStream(store.match());
      expect(output).toHaveLength(2);
    });
  });

  describe('getDatasets', () => {
    it('should execute correctly', async() => {
      const sourceUrl = 'ex:void';
      const b1 = {
        data: { identifier: DF.namedNode('ex:d1'), triples: DF.literal('123'), uriRegexPattern: DF.literal('^ex:') },
        get: (key: string) => (<any>b1.data)[key],
        has: (key: string) => key in b1.data,
      };
      const b2 = {
        data: { identifier: DF.namedNode('ex:d2'), triples: DF.literal('123'), uriSpace: DF.literal('ex:') },
        get: (key: string) => (<any>b2.data)[key],
        has: (key: string) => key in b2.data,
      };
      const b3 = {
        data: { identifier: DF.namedNode('ex:d3'), triples: DF.literal('123') },
        get: (key: string) => (<any>b3.data)[key],
        has: (key: string) => key in b3.data,
      };
      const b4 = {
        data: { identifier: DF.blankNode(), triples: DF.literal('123') },
        get: (key: string) => (<any>b4.data)[key],
        has: (key: string) => key in b4.data,
      };
      jest.spyOn((<any>actor).queryEngine, 'queryBindings').mockResolvedValue(streamifyArray([ b1, b2, b3, b4 ]));
      jest.spyOn(actor, 'getVocabularies').mockResolvedValue(undefined);
      const datasets = await actor.getDatasets(<any>{}, sourceUrl);
      expect(datasets).toEqual([
        expect.objectContaining({
          identifier: b1.data.identifier,
          source: sourceUrl,
        }),
        expect.objectContaining({
          identifier: b2.data.identifier,
          source: sourceUrl,
        }),
        expect.objectContaining({
          identifier: b3.data.identifier,
          source: sourceUrl,
        }),
        expect.objectContaining({
          identifier: b4.data.identifier,
          source: sourceUrl,
        }),
      ]);
    });
  });

  describe('getVocabularies', () => {
    it('should return vocabularies when present', async() => {
      jest.spyOn((<any>actor).queryEngine, 'queryBindings').mockResolvedValue(streamifyArray([
        { get: () => ({ value: 'v' }) },
      ]));
      await expect(actor.getVocabularies(<any>{}, <any>{})).resolves.toEqual([ 'v' ]);
    });

    it('should return undefined when no vocabularies are present', async() => {
      jest.spyOn((<any>actor).queryEngine, 'queryBindings').mockResolvedValue(streamifyArray([]));
      await expect(actor.getVocabularies(<any>{}, <any>{})).resolves.toBeUndefined();
    });
  });
});
