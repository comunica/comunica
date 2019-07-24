import {ActionContext} from "@comunica/core";
import "jest-rdf";
import LRUCache = require("lru-cache");
import {ISourceState} from "../lib/LinkedRdfSourcesAsyncRdfIterator";
import {MediatedLinkedRdfSourcesAsyncRdfIterator} from "../lib/MediatedLinkedRdfSourcesAsyncRdfIterator";
import {MediatedQuadSource} from "../lib/MediatedQuadSource";

const streamifyArray = require('streamify-array');
const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');

describe('MediatedQuadSource', () => {
  let context;
  let mediatorRdfDereference;
  let mediatorMetadata;
  let mediatorMetadataExtract;
  let mediatorRdfResolveHypermedia;
  let mediatorRdfResolveHypermediaLinks;
  let mediators;

  beforeEach(() => {
    context = ActionContext({});
    mediatorRdfDereference = {
      mediate: ({ url }) => Promise.resolve({
        quads: url === 'firstUrl'
          ? streamifyArray([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2'),
          ])
          : streamifyArray([
            quad('s3', 'p3', 'o3'),
            quad('s4', 'p4', 'o4'),
          ]),
        triples: true,
        url,
      }),
    };
    mediatorMetadata = {
      mediate: ({ quads }) => Promise.resolve({ data: quads, metadata: { a: 1 } }),
    };
    mediatorMetadataExtract = {
      mediate: ({ metadata }) => Promise.resolve({ metadata }),
    };
    mediatorRdfResolveHypermedia = {
      mediate: ({ forceSourceType, handledDatasets, metadata, quads }) => Promise.resolve({
        dataset: 'MYDATASET',
        source: {
          match: () => quads,
        },
      }),
    };
    mediatorRdfResolveHypermediaLinks = {
      mediate: () => Promise.resolve({ urls: ['next'] }),
    };
    mediators = {
      mediatorMetadata,
      mediatorMetadataExtract,
      mediatorRdfDereference,
      mediatorRdfResolveHypermedia,
      mediatorRdfResolveHypermediaLinks,
    };
  });

  describe('The MediatedQuadSource module', () => {
    it('should be a function', () => {
      expect(MediatedQuadSource).toBeInstanceOf(Function);
    });
  });

  describe('A MediatedQuadSource instance', () => {
    let source: MediatedQuadSource;

    beforeEach(() => {
      source = new MediatedQuadSource(10, context, 'firstUrl', 'forcedType', mediators);
    });

    describe('matchLazy', () => {
      it('should throw on regexps', () => {
        return expect(() => source.matchLazy(/.*/))
          .toThrow(new Error('MediatedQuadSource does not support matching by regular expressions.'));
      });

      it('should return a MediatedLinkedRdfSourcesAsyncRdfIterator', () => {
        return expect(source.matchLazy()).toBeInstanceOf(MediatedLinkedRdfSourcesAsyncRdfIterator);
      });

      it('should return a stream', async () => {
        expect(await arrayifyStream(source.matchLazy())).toEqualRdfQuadArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
      });

      it('should return a metadata event', async () => {
        const out = source.matchLazy();
        const metaPromise = new Promise((resolve, reject) => {
          out.on('metadata', resolve);
          out.on('end', () => reject(new Error('no metadata found')));
        });
        expect(await arrayifyStream(out)).toEqualRdfQuadArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
        expect(await metaPromise).toEqual({ a: 1 });
      });

      it('should set the first source after the first matchLazy call', async () => {
        source.matchLazy();
        expect((await source.sourcesState.sources.get('firstUrl')).metadata).toEqual({ a: 1 });
        expect((await source.sourcesState.sources.get('firstUrl')).source).toBeTruthy();
      });

      it('should allow a custom first source to be set', async () => {
        source.sourcesState = {
          sources: new LRUCache<string, Promise<ISourceState>>(10),
        };
        source.sourcesState.sources.set('firstUrl', Promise.resolve({
          handledDatasets: {},
          metadata: { a: 2 },
          source: {
            match: () => streamifyArray([
              quad('s1x', 'p1', 'o1'),
              quad('s2x', 'p2', 'o2'),
            ]),
          },
        }));
        return expect(await arrayifyStream(source.matchLazy())).toEqualRdfQuadArray([
          quad('s1x', 'p1', 'o1'),
          quad('s2x', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
      });

      it('should allow a custom first source to be set and emit a metadata event', async () => {
        source.sourcesState = {
          sources: new LRUCache<string, Promise<ISourceState>>(10),
        };
        source.sourcesState.sources.set('firstUrl', Promise.resolve({
          handledDatasets: {},
          metadata: { a: 2 },
          source: {
            match: () => streamifyArray([
              quad('s1x', 'p1', 'o1'),
              quad('s2x', 'p2', 'o2'),
            ]),
          },
        }));
        const out = source.matchLazy();
        const metaPromise = new Promise((resolve, reject) => {
          out.on('metadata', resolve);
          out.on('end', () => reject(new Error('no metadata found')));
        });
        expect(await arrayifyStream(out)).toEqualRdfQuadArray([
          quad('s1x', 'p1', 'o1'),
          quad('s2x', 'p2', 'o2'),
          quad('s3', 'p3', 'o3'),
          quad('s4', 'p4', 'o4'),
        ]);
        expect(await metaPromise).toEqual({ a: 2 });
      });

      it('should match three chained sources', async () => {
        let i = 0;
        mediatorRdfResolveHypermediaLinks.mediate = () => Promise.resolve({ urls: ['next' + i] });
        mediatorRdfResolveHypermedia.mediate = (args) => {
          if (i < 3) {
            i++;
          }
          return Promise.resolve({
            dataset: 'MYDATASET' + i,
            source: {
              match: () => streamifyArray([
                quad('s1' + i, 'p1' + i, 'o1' + i),
                quad('s2' + i, 'p2' + i, 'o2' + i),
              ]),
            },
          });
        };
        expect(await arrayifyStream(source.matchLazy())).toBeRdfIsomorphic([
          quad('s11', 'p11', 'o11'),
          quad('s21', 'p21', 'o21'),
          quad('s12', 'p12', 'o12'),
          quad('s22', 'p22', 'o22'),
          quad('s13', 'p13', 'o13'),
          quad('s23', 'p23', 'o23'),
        ]);
      });
    });

    describe('match', () => {
      it('should return a MediatedLinkedRdfSourcesAsyncRdfIterator', () => {
        return expect(source.match()).toBeInstanceOf(MediatedLinkedRdfSourcesAsyncRdfIterator);
      });
    });
  });
});
