import { ActorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorQuerySourceIdentifyHypermediaSparql } from '../lib/ActorQuerySourceIdentifyHypermediaSparql';
import { QuerySourceSparql } from '../lib/QuerySourceSparql';
import '@comunica/utils-jest';

const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};
const mediatorQuerySerialize: any = {
  mediate: () => ({}),
};

const DF = new DataFactory();

describe('ActorQuerySourceIdentifyHypermediaSparql', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
  });

  describe('The ActorQuerySourceIdentifyHypermediaSparql module', () => {
    it('should be a function', () => {
      expect(ActorQuerySourceIdentifyHypermediaSparql).toBeInstanceOf(Function);
    });

    it('should be a ActorQuerySourceIdentifyHypermediaSparql constructor', () => {
      expect(new (<any> ActorQuerySourceIdentifyHypermediaSparql)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQuerySourceIdentifyHypermediaSparql);
      expect(new (<any> ActorQuerySourceIdentifyHypermediaSparql)({ name: 'actor', bus }))
        .toBeInstanceOf(ActorQuerySourceIdentifyHypermedia);
    });

    it('should not be able to create new ActorQuerySourceIdentifyHypermediaSparql objects without \'new\'', () => {
      expect(() => {
        (<any> ActorQuerySourceIdentifyHypermediaSparql)();
      }).toThrow(`Class constructor ActorQuerySourceIdentifyHypermediaSparql cannot be invoked without 'new'`);
    });
  });

  describe('An ActorQuerySourceIdentifyHypermediaSparql instance', () => {
    let actor: ActorQuerySourceIdentifyHypermediaSparql;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyHypermediaSparql({
        name: 'actor',
        bus,
        mediatorHttp: <any> 'mediator',
        checkUrlSuffix: true,
        forceHttpGet: false,
        cacheSize: 1_024,
        mediatorMergeBindingsContext,
        mediatorQuerySerialize,
        bindMethod: 'values',
        countTimeout: 3_000,
        cardinalityCountQueries: true,
        cardinalityEstimateConstruction: false,
        forceGetIfUrlLengthBelow: 600,
        batchAskQueries: false,
        countFallbackDuration: 1_000,
        sparqlServerSoftwarePatterns: [ 'Virtuoso', 'Fuseki' ],
      });
    });

    describe('#test', () => {
      it('should test with a forced sparql source type', async() => {
        await expect(actor.test({
          url: 'URL',
          metadata: {},
          quads: <any> null,
          forceSourceType: 'sparql',
          context,
        })).resolves
          .toPassTest({ filterFactor: 1 });
      });

      it('should not test with a forced unknown source type', async() => {
        await expect(actor.test({
          url: 'URL',
          metadata: {},
          quads: <any> null,
          forceSourceType: 'unknown',
          context,
        }))
          .resolves.toFailTest('Actor actor is not able to handle source type unknown.');
      });

      it('should test with a sparql service metadata', async() => {
        await expect(actor.test({
          url: 'URL',
          metadata: { sparqlService: 'SERVICE' },
          quads: <any> null,
          context,
        })).resolves
          .toPassTest({ filterFactor: 1 });
      });

      it('should not test without a sparql service metadata', async() => {
        await expect(actor.test({ url: 'URL', metadata: {}, quads: <any> null, context })).resolves
          .toFailTest('Actor actor could not detect a SPARQL service description or URL ending on /sparql.');
      });

      it('should test with an URL ending with /sparql', async() => {
        await expect(actor.test({ url: 'URL/sparql', metadata: {}, quads: <any> null, context })).resolves
          .toPassTest({ filterFactor: 1 });
      });

      it('should test with an URL ending with /sparql/', async() => {
        await expect(actor.test({ url: 'URL/sparql/', metadata: {}, quads: <any> null, context })).resolves
          .toPassTest({ filterFactor: 1 });
      });

      it('should not test with an URL ending with /sparql if checkUrlSuffix is false', async() => {
        actor = new ActorQuerySourceIdentifyHypermediaSparql({
          name: 'actor',
          bus,
          mediatorHttp: <any>'mediator',
          checkUrlSuffix: false,
          forceHttpGet: false,
          bindMethod: 'values',
          countTimeout: 3_000,
          mediatorMergeBindingsContext,
          mediatorQuerySerialize,
          cardinalityCountQueries: true,
          cardinalityEstimateConstruction: false,
          cacheSize: 0,
          forceGetIfUrlLengthBelow: 0,
          batchAskQueries: false,
          countFallbackDuration: 1_000,
        });
        await expect(actor.test({ url: 'URL/sparql', metadata: {}, quads: <any> null, context })).resolves
          .toFailTest('Actor actor could not detect a SPARQL service description or URL ending on /sparql.');
      });

      it('should not test with an URL ending with /sparql if the type is forced to something else', async() => {
        actor = new ActorQuerySourceIdentifyHypermediaSparql({
          name: 'actor',
          bus,
          mediatorHttp: <any>'mediator',
          checkUrlSuffix: false,
          forceHttpGet: false,
          bindMethod: 'values',
          countTimeout: 3_000,
          mediatorMergeBindingsContext,
          mediatorQuerySerialize,
          cardinalityCountQueries: true,
          cardinalityEstimateConstruction: false,
          cacheSize: 0,
          forceGetIfUrlLengthBelow: 0,
          batchAskQueries: false,
          countFallbackDuration: 1_000,
        });
        await expect(actor
          .test({ url: 'URL/sparql', metadata: {}, quads: <any> null, forceSourceType: 'file', context }))
          .resolves.toFailTest('Actor actor is not able to handle source type file.');
      });
      it('should test with a forced sparql source type via actor parameter', async() => {
        actor = new ActorQuerySourceIdentifyHypermediaSparql({
          name: 'actor',
          bus,
          mediatorHttp: <any>'mediator',
          checkUrlSuffix: false,
          forceHttpGet: false,
          forceSourceType: true,
          bindMethod: 'values',
          countTimeout: 3_000,
          mediatorMergeBindingsContext,
          mediatorQuerySerialize,
          cardinalityCountQueries: true,
          cardinalityEstimateConstruction: false,
          cacheSize: 0,
          forceGetIfUrlLengthBelow: 0,
          batchAskQueries: false,
          countFallbackDuration: 1_000,
        });
        await expect(actor.test({
          url: 'URL',
          metadata: {},
          quads: <any> null,
          context,
        })).resolves
          .toPassTest({ filterFactor: 1 });
      });

      it('should not test without a forced sparql source type via actor parameter', async() => {
        actor = new ActorQuerySourceIdentifyHypermediaSparql({
          name: 'actor',
          bus,
          mediatorHttp: <any>'mediator',
          checkUrlSuffix: false,
          forceHttpGet: false,
          bindMethod: 'values',
          countTimeout: 3_000,
          mediatorMergeBindingsContext,
          mediatorQuerySerialize,
          cardinalityCountQueries: true,
          cardinalityEstimateConstruction: false,
          cacheSize: 0,
          forceGetIfUrlLengthBelow: 0,
          batchAskQueries: false,
          countFallbackDuration: 1_000,
        });
        await expect(actor.test({
          url: 'URL',
          metadata: {},
          quads: <any> null,
          context,
        })).resolves
          .toFailTest('Actor actor could not detect a SPARQL service description or URL ending on /sparql.');
      });

      it('should test with a valid server software header via configured patterns', async() => {
        await expect(actor.test({
          url: 'URL',
          metadata: { serverSoftware: 'Virtuoso/08.03.3332' },
          quads: <any> null,
          context,
        })).resolves
          .toPassTest({ filterFactor: 1 });
      });

      it('should test with a valid server software header at end of string via configured patterns', async() => {
        await expect(actor.test({
          url: 'URL',
          metadata: { serverSoftware: 'Caddy, Fuseki' },
          quads: <any> null,
          context,
        })).resolves
          .toPassTest({ filterFactor: 1 });
      });

      it('should not test with an invalid server software header via configured patterns', async() => {
        await expect(actor.test({
          url: 'URL',
          metadata: { serverSoftware: 'Apache' },
          quads: <any> null,
          context,
        })).resolves
          .toFailTest('Actor actor could not detect a SPARQL service description or URL ending on /sparql.');
      });

      it('should test with a valid server software header via custom patterns', async() => {
        actor = new ActorQuerySourceIdentifyHypermediaSparql({
          name: 'actor',
          bus,
          mediatorHttp: <any>'mediator',
          checkUrlSuffix: false,
          forceHttpGet: false,
          bindMethod: 'values',
          countTimeout: 3_000,
          mediatorMergeBindingsContext,
          mediatorQuerySerialize,
          cardinalityCountQueries: true,
          cardinalityEstimateConstruction: false,
          cacheSize: 0,
          forceGetIfUrlLengthBelow: 0,
          batchAskQueries: false,
          countFallbackDuration: 1_000,
          sparqlServerSoftwarePatterns: [ 'Custom' ],
        });
        await expect(actor.test({
          url: 'URL',
          metadata: { serverSoftware: 'Custom/1.0.0' },
          quads: <any> null,
          context,
        })).resolves
          .toPassTest({ filterFactor: 1 });
      });

      it('should not test with a server software header if no patterns are provided', async() => {
        actor = new ActorQuerySourceIdentifyHypermediaSparql({
          name: 'actor',
          bus,
          mediatorHttp: <any>'mediator',
          checkUrlSuffix: false,
          forceHttpGet: false,
          bindMethod: 'values',
          countTimeout: 3_000,
          mediatorMergeBindingsContext,
          mediatorQuerySerialize,
          cardinalityCountQueries: true,
          cardinalityEstimateConstruction: false,
          cacheSize: 0,
          forceGetIfUrlLengthBelow: 0,
          batchAskQueries: false,
          countFallbackDuration: 1_000,
        });
        await expect(actor.test({
          url: 'URL',
          metadata: { serverSoftware: 'Virtuoso/08.03.3332' },
          quads: <any> null,
          context,
        })).resolves
          .toFailTest('Actor actor could not detect a SPARQL service description or URL ending on /sparql.');
      });
    });

    describe('createCountFallback', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should be undefined if disabled', () => {
        actor = new ActorQuerySourceIdentifyHypermediaSparql({ ...(<any> actor), countFallbackDuration: 0 });
        expect(actor.createCountFallback('URL', context)).toBeUndefined();
      });

      it('should be active for the duration after its activation for patterns', () => {
        const now = jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const countFallback = actor.createCountFallback('URL', context)!;
        expect(countFallback.isActive(true)).toBe(false);
        expect(countFallback.isActive(false)).toBe(false);
        countFallback.activate(true);
        expect(countFallback.isActive(true)).toBe(true);
        expect(countFallback.isActive(false)).toBe(true);
        now.mockReturnValue(10_999);
        expect(countFallback.isActive(true)).toBe(true);
        expect(countFallback.isActive(false)).toBe(true);
        now.mockReturnValue(11_000);
        expect(countFallback.isActive(true)).toBe(false);
        expect(countFallback.isActive(false)).toBe(false);
      });

      it('should only be active for other operations after its activation for other operations', () => {
        const now = jest.spyOn(Date, 'now').mockReturnValue(10_000);
        const countFallback = actor.createCountFallback('URL', context)!;
        countFallback.activate(false);
        expect(countFallback.isActive(true)).toBe(false);
        expect(countFallback.isActive(false)).toBe(true);
        now.mockReturnValue(10_500);
        countFallback.activate(true);
        now.mockReturnValue(11_200);
        expect(countFallback.isActive(true)).toBe(true);
        expect(countFallback.isActive(false)).toBe(true);
        now.mockReturnValue(11_500);
        expect(countFallback.isActive(true)).toBe(false);
        expect(countFallback.isActive(false)).toBe(false);
      });

      it('should be shared by the sources of an endpoint', () => {
        actor.createCountFallback('URL', context)!.activate(true);
        expect(actor.createCountFallback('URL', context)!.isActive(true)).toBe(true);
        expect(actor.createCountFallback('OTHER', context)!.isActive(true)).toBe(false);
      });

      it('should log a warning when it becomes active', () => {
        const logWarn = jest.spyOn(<any> actor, 'logWarn').mockImplementation(() => {
          // Do nothing
        });
        const countFallback = actor.createCountFallback('URL', context)!;
        countFallback.activate(false);
        countFallback.activate(false);
        countFallback.activate(true);
        countFallback.activate(true);
        expect(logWarn).toHaveBeenCalledTimes(2);
        expect(logWarn).toHaveBeenNthCalledWith(1, context, 'Not sending COUNT queries over operations other than ' +
          'patterns to URL for 1000 ms, as one failed or took longer than 3000 ms');
        expect(logWarn).toHaveBeenNthCalledWith(2, context, 'Not sending COUNT queries over patterns to URL ' +
          'for 1000 ms, as one failed or took longer than 3000 ms');
      });
    });

    describe('#run', () => {
      it('should return sources that share the COUNT fallback of their endpoint', async() => {
        const output1 = await actor.run({ url: 'URL', metadata: {}, quads: <any> null, context });
        const output2 = await actor.run({ url: 'URL', metadata: {}, quads: <any> null, context });
        (<any> output1.source).countFallback.activate(true);
        expect((<any> output2.source).countFallback.isActive(true)).toBe(true);
      });

      it('should return a source', async() => {
        const output = await actor
          .run({ url: 'URL', metadata: { sparqlService: 'SERVICE' }, quads: <any> null, context });
        expect(output.source).toBeInstanceOf(QuerySourceSparql);
        expect(output.queriesService).toBe(true);
        expect((<any> output.source).url).toBe('SERVICE');
        expect((<any> output.source).cardinalityCountQueries).toBe(true);
        expect((<any> output.source).endpointFetcher.sparqlJsonParser.parseUnsupportedVersions).toBe(false);
        expect((<any> output.source).endpointFetcher.sparqlXmlParser.parseUnsupportedVersions).toBe(false);
      });

      it('should pass parseUnsupportedVersions to the parsers', async() => {
        const output = await actor.run({
          url: 'URL',
          metadata: { sparqlService: 'SERVICE' },
          quads: <any> null,
          context: context.set(KeysInitQuery.parseUnsupportedVersions, true),
        });
        expect(output.source).toBeInstanceOf(QuerySourceSparql);
        expect((<any> output.source).endpointFetcher.sparqlJsonParser.parseUnsupportedVersions).toBe(true);
        expect((<any> output.source).endpointFetcher.sparqlXmlParser.parseUnsupportedVersions).toBe(true);
      });

      it('should return a source when no sparqlService was defined in metadata', async() => {
        const output = await actor
          .run({ url: 'URL', metadata: {}, quads: <any> null, forceSourceType: 'sparql', context });
        expect(output.source).toBeInstanceOf(QuerySourceSparql);
        expect((<any> output.source).url).toBe('URL');
      });

      it('should return a source when no sparqlService was defined in metadata without forcing', async() => {
        const output = await actor
          .run({ url: 'URL', metadata: {}, quads: <any> null, context });
        expect(output.source).toBeInstanceOf(QuerySourceSparql);
        expect((<any> output.source).url).toBe('URL');
      });

      it('should return a source with the correct cache size', async() => {
        const output = await actor
          .run({ url: 'URL', metadata: { sparqlService: 'SERVICE' }, quads: <any> null, context });
        expect((<any> output.source).cache.max).toBe(1_024);
      });
    });
  });
});
