import { Readable } from 'stream';
import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import 'jest-rdf';
import type * as RDF from 'rdf-js';
import { RdfSourceQpf } from '../lib/RdfSourceQpf';

const arrayifyStream = require('arrayify-stream');
const quad = require('rdf-quad');
const streamifyArray = require('streamify-array');
const DF = new DataFactory();
const v = DF.variable('v');

describe('RdfSourceQpf', () => {
  let source: RdfSourceQpf;
  let bus: any;
  let metadata: any;
  let mediatorMetadata: any;
  let mediatorMetadataExtract: any;
  let mediatorRdfDereference: any;

  let S: RDF.Term;
  let P: RDF.Term;
  let O: RDF.Term;
  let G: RDF.Term;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    mediatorMetadata = {
      mediate: (args: any) => Promise.resolve({
        data: args.quads,
        metadata: args.quads,
      }),
    };
    mediatorMetadataExtract = {
      mediate: (action: any) => new Promise((resolve, reject) => {
        action.metadata.on('error', reject);
        action.metadata.on('end', () => resolve({ metadata: { next: 'NEXT' }}));
      }),
    };
    mediatorRdfDereference = {
      mediate: (args: any) => Promise.resolve({
        url: args.url,
        quads: streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]),
        triples: false,
      }),
    };

    metadata = {
      searchForms: {
        values: [
          {
            getUri: (entries: any) => `${entries.s || '_'},${entries.p || '_'},${entries.o || '_'
            },${entries.g || '_'}`,
            mappings: {
              g: 'G',
              o: 'O',
              p: 'P',
              s: 'S',
            },
          },
        ],
      },
    };

    source = new RdfSourceQpf(
      mediatorMetadata,
      mediatorMetadataExtract,
      mediatorRdfDereference,
      's',
      'p',
      'o',
      'g',
      metadata,
      ActionContext({}),
      streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]),
    );

    S = DF.namedNode('S');
    P = DF.namedNode('P');
    O = DF.namedNode('O');
    G = DF.namedNode('G');
  });

  describe('#constructor', () => {
    it('should be a function', () => {
      return expect(RdfSourceQpf).toBeInstanceOf(Function);
    });

    it('should be constructable without initialQuads', () => {
      const s = new RdfSourceQpf(
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        'o',
        'p',
        's',
        'g',
        metadata,
        ActionContext({}),
        undefined,
      );
      expect(s).toBeInstanceOf(RdfSourceQpf);
      expect((<any> s).initialQuads).toBeFalsy();
    });

    it('should be constructable with initialQuads', async() => {
      const s = new RdfSourceQpf(
        mediatorMetadata,
        mediatorMetadataExtract,
        mediatorRdfDereference,
        'o',
        'p',
        's',
        'g',
        metadata,
        ActionContext({}),
        streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]),
      );
      expect(s).toBeInstanceOf(RdfSourceQpf);
      expect(await arrayifyStream((<any> s).getCachedQuads(v, v, v, v))).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
    });
  });

  describe('getSearchForm', () => {
    it('should return a searchForm', () => {
      return expect(source.getSearchForm(metadata)).toEqual(metadata.searchForms.values[0]);
    });

    it('should return a searchForm without graph', () => {
      metadata = {
        searchForms: {
          values: [
            {
              getUri: (entries: any) => `${entries.s || '_'},${entries.p || '_'},${entries.o || '_'
              },${entries.g || '_'}`,
              mappings: {
                o: 'O',
                p: 'P',
                s: 'S',
              },
            },
          ],
        },
      };
      return expect(source.getSearchForm(metadata)).toEqual(metadata.searchForms.values[0]);
    });

    it('should return null when no valid mappings are present', () => {
      metadata = {
        searchForms: {
          values: [
            {
              mappings: {},
            },
          ],
        },
      };
      return expect(source.getSearchForm(metadata)).toBe(undefined);
    });

    it('should return null when no values are present', () => {
      metadata = {
        searchForms: {},
      };
      return expect(source.getSearchForm(metadata)).toBe(undefined);
    });

    it('should return null when no search forms are present', () => {
      metadata = {
      };
      return expect(source.getSearchForm(metadata)).toBe(undefined);
    });
  });

  describe('createFragmentUri', () => {
    it('should create a valid fragment URI with materialized terms', () => {
      return expect(source.createFragmentUri(metadata.searchForms.values[0],
        DF.namedNode('S'),
        DF.namedNode('P'),
        DF.namedNode('O'),
        DF.namedNode('G')))
        .toEqual('S,P,O,G');
    });

    it('should create a valid fragment URI with only a few materialized terms', () => {
      return expect(source.createFragmentUri(metadata.searchForms.values[0],
        v,
        DF.namedNode('P'),
        v,
        DF.namedNode('G')))
        .toEqual('_,P,_,G');
    });
  });

  describe('match', () => {
    it('should return a copy of the initial quads for the empty pattern', async() => {
      expect(await arrayifyStream(source.match(v, v, v, v))).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
    });

    it('should emit metadata for the empty pattern', async() => {
      const output = source.match(v, v, v, v);
      const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
      await arrayifyStream(output);
      expect(await metadataPromise).toBe(metadata);
    });

    it('should return a copy of the initial quads for the empty pattern with the default graph', async() => {
      expect(await arrayifyStream(source.match(
        v, v, v, DF.defaultGraph(),
      )))
        .toBeRdfIsomorphic([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]);
    });

    it('should return multiple copies of the initial quads for the empty pattern', async() => {
      expect(await arrayifyStream(source.match(v, v, v, v))).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      expect(await arrayifyStream(source.match(v, v, v, v))).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      expect(await arrayifyStream(source.match(v, v, v, v))).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
    });

    it('should handle a non-empty pattern and filter only matching quads', async() => {
      expect(await arrayifyStream(source.match(
        DF.namedNode('s1'), v, DF.namedNode('o1'), v,
      )))
        .toBeRdfIsomorphic([
          quad('s1', 'p1', 'o1'),
        ]);
      expect(await arrayifyStream(source.match(
        DF.namedNode('s2'), v, DF.namedNode('o2'), v,
      )))
        .toBeRdfIsomorphic([
          quad('s2', 'p2', 'o2'),
        ]);
      expect(await arrayifyStream(source.match(
        DF.namedNode('s3'), v, DF.namedNode('o3'), v,
      )))
        .toBeRdfIsomorphic([]);
    });

    it('should emit metadata for a non-empty pattern', async() => {
      const output = source.match(DF.namedNode('s1'), v, DF.namedNode('o1'), v);
      const metadataPromise = new Promise(resolve => output.getProperty('metadata', resolve));
      await arrayifyStream(output);
      expect(await metadataPromise).toEqual({ next: 'NEXT' });
    });

    // The following test is not applicable anymore.
    // Filtering with shared variables has been moved up into the quad pattern query operation actor
    // it('should handle a pattern with variables that occur multiple times in the pattern', async () => {
    // mediatorRdfDereference.mediate = (args) => Promise.resolve({
    //     url: args.url,
    //     quads: streamifyArray([
    //       quad('s1', 'p1', 'o1'),
    //       quad('s2', 'p2', 'o2'),
    //       quad('t', 'p2', 't'),
    //     ]),
    //     triples: false,
    // });
    //
    // expect(await arrayifyStream(source.match(
    //     DF.variable('v'), null, DF.variable('v'))))
    //     .toBeRdfIsomorphic([
    //       quad('t', 'p2', 't'),
    //     ]);
    // });

    it('should delegate errors from the RDF dereference stream', () => {
      const quads = new Readable();
      quads._read = () => {
        quads.emit('error', error);
      };
      mediatorRdfDereference.mediate = (args: any) => Promise.resolve({
        url: args.url,
        quads,
        triples: false,
      });

      const error = new Error('a');
      return new Promise<void>((resolve, reject) => {
        const output: RDF.Stream = source.match(S, P, O, G);
        output.on('error', e => {
          expect(e).toEqual(error);
          resolve();
        });
        output.on('data', reject);
        output.on('end', reject);
      });
    });

    it('should delegate errors from the metadata split stream', () => {
      const quads = new Readable();
      quads._read = () => {
        quads.emit('error', error);
      };
      mediatorMetadata.mediate = () => Promise.resolve({
        data: quads,
        metadata: quads,
      });

      const error = new Error('a');
      return new Promise<void>((resolve, reject) => {
        const output: RDF.Stream = source.match(S, P, O, G);
        output.on('error', e => {
          expect(e).toEqual(error);
          resolve();
        });
        output.on('data', reject);
        output.on('end', reject);
      });
    });

    it('should ignore errors from the metadata extract mediator', async() => {
      mediatorMetadataExtract.mediate = () => Promise.reject(new Error('abc'));
      expect(await arrayifyStream(source.match(v, v, v, v))).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
    });
  });
});

// eslint-disable-next-line mocha/max-top-level-suites
describe('RdfSourceQpf with a custom default graph', () => {
  let source: RdfSourceQpf;
  let bus: any;
  let metadata: any;
  let mediatorMetadata: any;
  let mediatorMetadataExtract: any;
  let mediatorRdfDereference: any;

  let S: RDF.Term;
  let P: RDF.Term;
  let O: RDF.Term;
  let G: RDF.Term;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    mediatorMetadata = {
      mediate: (args: any) => Promise.resolve({
        data: args.quads,
        metadata: null,
      }),
    };
    mediatorMetadataExtract = {
      mediate: () => Promise.resolve({ metadata: { next: 'NEXT' }}),
    };
    mediatorRdfDereference = {
      mediate: (args: any) => Promise.resolve({
        url: args.url,
        quads: streamifyArray([
          quad('s1', 'p1', 'o1', 'DEFAULT_GRAPH'),
          quad('s2', 'p2', 'o2', 'DEFAULT_GRAPH'),
          quad('s1', 'p3', 'o1', 'CUSTOM_GRAPH'),
          quad('s2', 'p4', 'o2', 'CUSTOM_GRAPH'),
          quad('DEFAULT_GRAPH', 'defaultInSubject', 'o2', 'DEFAULT_GRAPH'),
          quad('s1-', 'actualDefaultGraph', 'o1'),
        ]),
        triples: false,
      }),
    };

    metadata = {
      defaultGraph: 'DEFAULT_GRAPH',
      searchForms: {
        values: [
          {
            getUri: (entries: any) => `${entries.s || '_'},${entries.p || '_'},${entries.o || '_'
            },${entries.g || '_'}`,
            mappings: {
              g: 'G',
              o: 'O',
              p: 'P',
              s: 'S',
            },
          },
        ],
      },
    };

    source = new RdfSourceQpf(
      mediatorMetadata,
      mediatorMetadataExtract,
      mediatorRdfDereference,
      's',
      'p',
      'o',
      'g',
      metadata,
      ActionContext({}),
      streamifyArray([
        quad('s1', 'p1', 'o1', 'DEFAULT_GRAPH'),
        quad('s2', 'p2', 'o2', 'DEFAULT_GRAPH'),
        quad('s1', 'p3', 'o1', 'CUSTOM_GRAPH'),
        quad('s2', 'p4', 'o2', 'CUSTOM_GRAPH'),
        quad('DEFAULT_GRAPH', 'defaultInSubject', 'o2', 'DEFAULT_GRAPH'),
        quad('s1-', 'actualDefaultGraph', 'o1'),
      ]),
    );

    S = DF.namedNode('S');
    P = DF.namedNode('P');
    O = DF.namedNode('O');
    G = DF.namedNode('G');
  });

  describe('match', () => {
    it('should return quads in the overridden default graph', async() => {
      expect(await arrayifyStream(source.match(
        DF.namedNode('s1'), v, DF.namedNode('o1'), DF.defaultGraph(),
      )))
        .toBeRdfIsomorphic([
          quad('s1', 'p1', 'o1'),
        ]);
      expect(await arrayifyStream(source.match(
        DF.namedNode('s2'), v, DF.namedNode('o2'), DF.defaultGraph(),
      )))
        .toBeRdfIsomorphic([
          quad('s2', 'p2', 'o2'),
        ]);
      expect(await arrayifyStream(source.match(
        DF.namedNode('s3'), v, DF.namedNode('o3'), DF.defaultGraph(),
      )))
        .toBeRdfIsomorphic([]);
    });

    it('should return quads in all graphs', async() => {
      expect(await arrayifyStream(source.match(
        DF.namedNode('s1'), v, DF.namedNode('o1'), v,
      )))
        .toBeRdfIsomorphic([
          quad('s1', 'p1', 'o1'),
          quad('s1', 'p3', 'o1', 'CUSTOM_GRAPH'),
        ]);
      expect(await arrayifyStream(source.match(
        DF.namedNode('s2'), v, DF.namedNode('o2'), v,
      )))
        .toBeRdfIsomorphic([
          quad('s2', 'p2', 'o2'),
          quad('s2', 'p4', 'o2', 'CUSTOM_GRAPH'),
        ]);
      expect(await arrayifyStream(source.match(
        DF.namedNode('s3'), v, DF.namedNode('o3'), v,
      )))
        .toBeRdfIsomorphic([]);
    });

    it('should return quads in a custom graph', async() => {
      expect(await arrayifyStream(source.match(
        DF.namedNode('s1'), v, DF.namedNode('o1'), DF.namedNode('CUSTOM_GRAPH'),
      )))
        .toBeRdfIsomorphic([
          quad('s1', 'p3', 'o1', 'CUSTOM_GRAPH'),
        ]);
      expect(await arrayifyStream(source.match(
        DF.namedNode('s2'), v, DF.namedNode('o2'), DF.namedNode('CUSTOM_GRAPH'),
      )))
        .toBeRdfIsomorphic([
          quad('s2', 'p4', 'o2', 'CUSTOM_GRAPH'),
        ]);
      expect(await arrayifyStream(source.match(
        DF.namedNode('s3'), v, DF.namedNode('o3'), DF.namedNode('CUSTOM_GRAPH'),
      )))
        .toBeRdfIsomorphic([]);
    });

    it('should not modify an overridden default graph in the subject position', async() => {
      expect(await arrayifyStream(source.match(
        v, DF.namedNode('defaultInSubject'), v, v,
      )))
        .toBeRdfIsomorphic([
          quad('DEFAULT_GRAPH', 'defaultInSubject', 'o2', DF.defaultGraph()),
        ]);
    });

    it('should also return triples from the actual default graph', async() => {
      expect(await arrayifyStream(source.match(
        v, DF.namedNode('actualDefaultGraph'), v, v,
      )))
        .toBeRdfIsomorphic([
          quad('s1-', 'actualDefaultGraph', 'o1', DF.defaultGraph()),
        ]);
      expect(await arrayifyStream(source.match(
        v, DF.namedNode('actualDefaultGraph'), v, DF.defaultGraph(),
      )))
        .toBeRdfIsomorphic([
          quad('s1-', 'actualDefaultGraph', 'o1', DF.defaultGraph()),
        ]);
    });

    it('should return a mapped copy of the initial quads for the empty pattern', async() => {
      expect(await arrayifyStream(source.match(v, v, v, v))).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1', DF.defaultGraph()),
        quad('s2', 'p2', 'o2', DF.defaultGraph()),
        quad('s1', 'p3', 'o1', 'CUSTOM_GRAPH'),
        quad('s2', 'p4', 'o2', 'CUSTOM_GRAPH'),
        quad('DEFAULT_GRAPH', 'defaultInSubject', 'o2', DF.defaultGraph()),
        quad('s1-', 'actualDefaultGraph', 'o1'),
      ]);
    });
  });
});
