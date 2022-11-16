import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import { ActionContext } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import 'jest-rdf';
import LRUCache = require('lru-cache');
import { DataFactory } from 'rdf-data-factory';
import type { ISourceState } from '../lib/LinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from '../lib/MediatedLinkedRdfSourcesAsyncRdfIterator';
import { MediatedQuadSource } from '../lib/MediatedQuadSource';
import { mediators as utilMediators } from './MediatorDereferenceRdf-util';

const DF = new DataFactory();
const quad = require('rdf-quad');

const v = DF.variable('v');

describe('MediatedQuadSource', () => {
  let context: IActionContext;
  let mediatorDereferenceRdf: MediatorDereferenceRdf;
  let mediatorMetadata;
  let mediatorMetadataExtract;
  let mediatorRdfResolveHypermedia: any;
  let mediatorRdfResolveHypermediaLinks: any;
  let mediatorRdfResolveHypermediaLinksQueue: any;
  let mediators: any;

  beforeEach(() => {
    context = new ActionContext({});
    mediatorDereferenceRdf = utilMediators.mediatorDereferenceRdf;
    mediatorMetadata = utilMediators.mediatorMetadata;
    mediatorMetadataExtract = utilMediators.mediatorMetadataExtract;
    mediatorRdfResolveHypermedia = utilMediators.mediatorRdfResolveHypermedia;
    mediatorRdfResolveHypermediaLinks = utilMediators.mediatorRdfResolveHypermediaLinks;
    mediatorRdfResolveHypermediaLinksQueue = utilMediators.mediatorRdfResolveHypermediaLinksQueue;
    mediators = utilMediators;
  });

  describe('The MediatedQuadSource module', () => {
    it('should be a function', () => {
      expect(MediatedQuadSource).toBeInstanceOf(Function);
    });
  });

  describe('A MediatedQuadSource instance', () => {
    let source: MediatedQuadSource;

    beforeEach(() => {
      source = new MediatedQuadSource(10, context, 'firstUrl', 'forcedType', 64, mediators);
    });

    describe('match', () => {
      it('should return a MediatedLinkedRdfSourcesAsyncRdfIterator', () => {
        return expect(source.match(v, v, v, v)).toBeInstanceOf(MediatedLinkedRdfSourcesAsyncRdfIterator);
      });

      it('should return a stream', async() => {
        expect(await arrayifyStream(source.match(v, v, v, v))).toEqualRdfQuadArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
      });

      it('should return a metadata event', async() => {
        const out = source.match(v, v, v, v);
        const metaPromise = new Promise(resolve => out.getProperty('metadata', resolve));
        expect(await arrayifyStream(out)).toEqualRdfQuadArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
        expect(await metaPromise).toEqual({ firstMeta: true, a: 1 });
      });

      it('should set the first source after the first match call', async() => {
        source.match(v, v, v, v);
        expect((<any> (await source.sourcesState.sources.get('firstUrl'))).metadata).toEqual({ a: 1 });
        expect((<any> (await source.sourcesState.sources.get('firstUrl'))).source).toBeTruthy();
      });

      it('should allow a custom first source to be set', async() => {
        source.sourcesState = {
          sources: new LRUCache<string, Promise<ISourceState>>(10),
        };
        source.sourcesState.sources.set('firstUrl', Promise.resolve({
          link: { url: 'firstUrl' },
          handledDatasets: {},
          metadata: { a: 2 },
          source: {
            match() {
              const it = new ArrayIterator([
                quad('s1x', 'p1', 'o1'),
                quad('s2x', 'p2', 'o2'),
              ], { autoStart: false });
              it.setProperty('metadata', {});
              return it;
            },
          },
        }));
        expect(await arrayifyStream(source.match(v, v, v, v))).toEqualRdfQuadArray([
          quad('s1x', 'p1', 'o1'),
          quad('s2x', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
      });

      it('should allow a custom first source to be set and emit a metadata event', async() => {
        source.sourcesState = {
          sources: new LRUCache<string, Promise<ISourceState>>(10),
        };
        source.sourcesState.sources.set('firstUrl', Promise.resolve({
          link: { url: 'firstUrl' },
          handledDatasets: {},
          metadata: { a: 2 },
          source: {
            match() {
              const it = new ArrayIterator([
                quad('s1x', 'p1', 'o1'),
                quad('s2x', 'p2', 'o2'),
              ], { autoStart: false });
              it.setProperty('metadata', { firstMeta: true });
              return it;
            },
          },
        }));
        const out = source.match(v, v, v, v);
        const metaPromise = new Promise(resolve => out.getProperty('metadata', resolve));
        expect(await arrayifyStream(out)).toEqualRdfQuadArray([
          quad('s1x', 'p1', 'o1'),
          quad('s2x', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
        expect(await metaPromise).toEqual({ firstMeta: true, a: 2 });
      });

      it('should match three chained sources', async() => {
        let i = 0;
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ links: [{ url: `next${i}` }]});
        mediatorRdfResolveHypermedia.mediate = (args: any) => {
          if (i < 3) {
            i++;
          }
          return Promise.resolve({
            dataset: `MYDATASET${i}`,
            source: {
              match() {
                const it = new ArrayIterator([
                  quad(`s1${i}`, `p1${i}`, `o1${i}`),
                  quad(`s2${i}`, `p2${i}`, `o2${i}`),
                ], { autoStart: false });
                it.setProperty('metadata', { firstMeta: true });
                return it;
              },
            },
          });
        };
        expect(await arrayifyStream(source.match(v, v, v, v))).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
      });
    });
  });
});
