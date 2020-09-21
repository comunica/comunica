import { ActionContext, Bus } from '@comunica/core';
import 'jest-rdf';
import { ArrayIterator } from 'asynciterator';
import { MediatedQuadSource } from '..';
import { ActorRdfResolveQuadPatternHypermedia } from '../lib/ActorRdfResolveQuadPatternHypermedia';

const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('ActorRdfResolveQuadPatternHypermedia', () => {
  let bus: any;
  let mediatorRdfDereference: any;
  let mediatorMetadata: any;
  let mediatorMetadataExtract: any;
  let mediatorRdfResolveHypermedia: any;
  let mediatorRdfResolveHypermediaLinks: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorRdfDereference = {
      async mediate({ url }: any) {
        const data = {
          quads: url === 'firstUrl' ?
            new ArrayIterator([
              quad('s1', 'p1', 'o1'),
              quad('s2', 'p2', 'o2'),
            ], { autoStart: false }) :
            new ArrayIterator([
              quad('s3', 'p3', 'o3'),
              quad('s4', 'p4', 'o4'),
            ], { autoStart: false }),
          triples: true,
          url,
        };
        data.quads.setProperty('metadata', { firstMeta: true });
        return data;
      },
    };
    mediatorMetadata = {
      mediate: ({ quads }: any) => Promise.resolve({ data: quads, metadata: { a: 1 }}),
    };
    mediatorMetadataExtract = {
      mediate: ({ metadata }: any) => Promise.resolve({ metadata }),
    };
    mediatorRdfResolveHypermedia = {
      mediate: ({ forceSourceType, handledDatasets, metadata, quads }: any) => Promise.resolve({
        dataset: 'MYDATASET',
        source: {
          match: () => quads.clone(),
        },
      }),
    };
    mediatorRdfResolveHypermediaLinks = {
      mediate: () => Promise.resolve({ urls: [ 'next' ]}),
    };
  });

  describe('The ActorRdfResolveQuadPatternHypermedia module', () => {
    it('should be a function', () => {
      expect(ActorRdfResolveQuadPatternHypermedia).toBeInstanceOf(Function);
    });

    it('should be a ActorRdfResolveQuadPatternHypermedia constructor', () => {
      expect(new (<any> ActorRdfResolveQuadPatternHypermedia)({
        bus,
        mediatorRdfDereference,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfResolveHypermedia,
        mediatorRdfResolveHypermediaLinks,
      })).toBeInstanceOf(ActorRdfResolveQuadPatternHypermedia);
    });

    it('should be a ActorRdfResolveQuadPatternHypermedia constructor constructable with cache', () => {
      let listener = null;
      const httpInvalidator = {
        addInvalidateListener: (l: any) => listener = l,
      };
      expect(new (<any> ActorRdfResolveQuadPatternHypermedia)({
        bus,
        cacheSize: 10,
        httpInvalidator,
        mediatorRdfDereference,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfResolveHypermedia,
        mediatorRdfResolveHypermediaLinks,
      })).toBeInstanceOf(ActorRdfResolveQuadPatternHypermedia);
      expect(listener).toBeTruthy();
    });

    it('should not be able to create new ActorRdfResolveQuadPatternHypermedia objects without \'new\'', () => {
      expect(() => { (<any> ActorRdfResolveQuadPatternHypermedia)(); }).toThrow();
    });
  });

  describe('An ActorRdfResolveQuadPatternHypermedia instance', () => {
    let actor: any;
    let context: ActionContext;
    let pattern: any;
    let httpInvalidator: any;
    let listener: any;

    beforeEach(() => {
      httpInvalidator = {
        addInvalidateListener: (l: any) => listener = l,
      };
      actor = new ActorRdfResolveQuadPatternHypermedia({
        bus,
        cacheSize: 10,
        httpInvalidator,
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        mediatorRdfResolveHypermedia,
        mediatorRdfResolveHypermediaLinks,
        name: 'actor',
      });
      context = ActionContext({ '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'firstUrl' }});
      pattern = quad('?s', 'p1', '?o');
    });

    describe('test', () => {
      it('should test', () => {
        return expect(actor.test({ pattern: null,
          context: ActionContext(
            { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'abc' }},
          ) }))
          .resolves.toBeTruthy();
      });

      it('should test on raw source form', () => {
        return expect(actor.test({ pattern: null,
          context: ActionContext(
            { '@comunica/bus-rdf-resolve-quad-pattern:source': 'abc' },
          ) }))
          .resolves.toBeTruthy();
      });

      it('should not test without a context', () => {
        return expect(actor.test({ pattern: null, context: null })).rejects.toBeTruthy();
      });

      it('should not test without a file', () => {
        return expect(actor.test({ pattern: null, context: ActionContext({}) })).rejects.toBeTruthy();
      });

      it('should not test on an invalid value', () => {
        return expect(actor.test({ pattern: null,
          context: ActionContext(
            { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: null }},
          ) }))
          .rejects.toBeTruthy();
      });

      it('should not test on no sources', () => {
        return expect(actor.test({ pattern: null,
          context: ActionContext(
            { '@comunica/bus-rdf-resolve-quad-pattern:sources': []},
          ) }))
          .rejects.toBeTruthy();
      });

      it('should not test on multiple sources', () => {
        return expect(actor.test(
          { pattern: null,
            context: ActionContext(
              { '@comunica/bus-rdf-resolve-quad-pattern:sources': [{ value: 'a' }, { value: 'b' }]},
            ) },
        ))
          .rejects.toBeTruthy();
      });
    });

    describe('getSource', () => {
      it('should return a MediatedQuadSource', async() => {
        expect(await actor.getSource(context, pattern)).toBeInstanceOf(MediatedQuadSource);
      });

      it('should cache the source', async() => {
        const source1 = await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern);
        const source2 = await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern)).toBe(source1);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern)).toBe(source2);
      });

      it('should cache the source and allow invalidation for a specific url', async() => {
        const source1 = await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern);
        const source2 = await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern)).toBe(source1);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern)).toBe(source2);

        listener({ url: 'source1' });

        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern)).not.toBe(source1);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern)).toBe(source2);
      });

      it('should cache the source and allow invalidation for all urls', async() => {
        const source1 = await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern);
        const source2 = await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern)).toBe(source1);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern)).toBe(source2);

        listener({});

        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern)).not.toBe(source1);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern)).not.toBe(source2);
      });

      it('should not cache the source with cache size 0', async() => {
        actor = new ActorRdfResolveQuadPatternHypermedia({
          bus,
          cacheSize: 0,
          httpInvalidator,
          mediatorMetadata,
          mediatorMetadataExtract,
          mediatorRdfDereference,
          mediatorRdfResolveHypermedia,
          mediatorRdfResolveHypermediaLinks,
          name: 'actor',
        });

        const source1 = await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern);
        const source2 = await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source1' }},
        ), pattern)).not.toBe(source1);
        expect(await actor.getSource(ActionContext(
          { '@comunica/bus-rdf-resolve-quad-pattern:source': { value: 'source2' }},
        ), pattern)).not.toBe(source2);
      });
    });

    describe('run', () => {
      it('should return a quad stream and metadata', async() => {
        const { data } = await actor.run({ context, pattern });
        expect(await arrayifyStream(data)).toEqualRdfQuadArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
        expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
          .toEqual({ firstMeta: true, a: 1 });
      });

      it('should return a quad stream and metadata, with metadata resolving first', async() => {
        const { data } = await actor.run({ context, pattern });
        expect(await new Promise(resolve => data.getProperty('metadata', resolve)))
          .toEqual({ firstMeta: true, a: 1 });
        expect(await arrayifyStream(data)).toEqualRdfQuadArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
      });
    });
  });
});
