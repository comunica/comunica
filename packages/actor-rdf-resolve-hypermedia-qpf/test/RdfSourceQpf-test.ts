import {ActionContext, Bus} from "@comunica/core";
import {blankNode, defaultGraph, namedNode, variable} from "@rdfjs/data-model";
import "jest-rdf";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import {RdfSourceQpf} from "../lib/RdfSourceQpf";

const arrayifyStream = require('arrayify-stream');
const streamifyArray = require('streamify-array');
const quad = require('rdf-quad');

// tslint:disable:object-literal-sort-keys

describe('RdfSourceQpf', () => {
  let source: RdfSourceQpf;
  let bus;
  let metadata;
  let mediatorMetadata;
  let mediatorMetadataExtract;
  let mediatorRdfDereference;

  let S;
  let P;
  let O;
  let G;
  let V1;
  let V2;
  let V3;
  let V4;
  let BV1;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });

    mediatorMetadata = {
      mediate: (args) => Promise.resolve({
        data: args.quads,
        metadata: null,
      }),
    };
    mediatorMetadataExtract = {
      mediate: () => Promise.resolve({ metadata: { next: 'NEXT' } }),
    };
    mediatorRdfDereference = {
      mediate: (args) => Promise.resolve({
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
            getUri: (entries) => (entries.s || '_') + ',' + (entries.p || '_') + ',' + (entries.o || '_')
              + ',' + (entries.g || '_'),
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

    S = namedNode('S');
    P = namedNode('P');
    O = namedNode('O');
    G = namedNode('G');
    V1 = variable('v1');
    V2 = variable('v2');
    V3 = variable('v3');
    V4 = variable('v4');
    BV1 = blankNode('v1');
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
        null,
      );
      expect(s).toBeInstanceOf(RdfSourceQpf);
      expect((<any> s).initialQuads).toBeFalsy();
    });

    it('should be constructable with initialQuads', async () => {
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
      expect(await arrayifyStream((<any> s).getCachedQuads())).toBeRdfIsomorphic([
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
              getUri: (entries) => (entries.s || '_') + ',' + (entries.p || '_') + ',' + (entries.o || '_')
                + ',' + (entries.g || '_'),
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
      return expect(source.getSearchForm(metadata)).toBe(null);
    });

    it('should return null when no values are present', () => {
      metadata = {
        searchForms: {},
      };
      return expect(source.getSearchForm(metadata)).toBe(null);
    });

    it('should return null when no search forms are present', () => {
      metadata = {
      };
      return expect(source.getSearchForm(metadata)).toBe(null);
    });
  });

  describe('createFragmentUri', () => {
    it('should create a valid fragment URI with materialized terms', () => {
      return expect(source.createFragmentUri(metadata.searchForms.values[0],
        namedNode('S'), namedNode('P'), namedNode('O'), namedNode('G')))
        .toEqual('S,P,O,G');
    });

    it('should create a valid fragment URI with only a few materialized terms', () => {
      return expect(source.createFragmentUri(metadata.searchForms.values[0],
        null, namedNode('P'), null, namedNode('G')))
        .toEqual('_,P,_,G');
    });
  });

  describe('getDuplicateElementLinks', () => {
    it('should return falsy on a blank pattern', () => {
      return expect(source.getDuplicateElementLinks()).toBeFalsy();
    });

    it('should return falsy on patterns with a single subject element', () => {
      return expect(source.getDuplicateElementLinks(S)).toBeFalsy();
    });

    it('should return falsy on patterns with a single predicate element', () => {
      return expect(source.getDuplicateElementLinks(null, P)).toBeFalsy();
    });

    it('should return falsy on patterns with a single object element', () => {
      return expect(source.getDuplicateElementLinks(null, null, O)).toBeFalsy();
    });

    it('should return falsy on patterns with a single graph element', () => {
      return expect(source.getDuplicateElementLinks(null, null, null, G)).toBeFalsy();
    });

    it('should return falsy on patterns with different elements', () => {
      return expect(source.getDuplicateElementLinks(S, P, O, G)).toBeFalsy();
    });

    it('should return falsy on patterns with different variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V2, V3, V4)).toBeFalsy();
    });

    it('should return falsy on patterns when blank nodes and variables have the same value', () => {
      return expect(source.getDuplicateElementLinks(V1, BV1, V3, V4)).toBeFalsy();
    });

    it('should return correctly on patterns with equal subject and predicate variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V1, V3, V4)).toEqual({ subject: [ 'predicate' ] });
    });

    it('should ignore patterns with equal subject and predicate blank nodes', () => {
      return expect(source.getDuplicateElementLinks(BV1, BV1, V3, V4)).toEqual(null);
    });

    it('should return correctly on patterns with equal subject and object variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V2, V1, V4)).toEqual({ subject: [ 'object' ] });
    });

    it('should return correctly on patterns with equal subject and graph variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V2, V3, V1)).toEqual({ subject: [ 'graph' ] });
    });

    it('should return correctly on patterns with equal subject, predicate and object variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V1, V1, V4)).toEqual({ subject: [ 'predicate', 'object' ] });
    });

    it('should return correctly on patterns with equal subject, predicate and graph variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V1, V3, V1)).toEqual({ subject: [ 'predicate', 'graph' ] });
    });

    it('should return correctly on patterns with equal subject, object and graph variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V2, V1, V1)).toEqual({ subject: [ 'object', 'graph' ] });
    });

    it('should return correctly on patterns with equal subject, predicate, object and graph variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V1, V1, V1))
        .toEqual({ subject: [ 'predicate', 'object', 'graph' ] });
    });

    it('should return correctly on patterns with equal predicate and object variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V2, V2, V4)).toEqual({ predicate: [ 'object' ] });
    });

    it('should return correctly on patterns with equal predicate and graph variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V2, V3, V2)).toEqual({ predicate: [ 'graph' ] });
    });

    it('should return correctly on patterns with equal predicate, object and graph variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V2, V2, V2)).toEqual({ predicate: [ 'object', 'graph' ] });
    });

    it('should return correctly on patterns with equal object and graph variables', () => {
      return expect(source.getDuplicateElementLinks(V1, V2, V3, V3)).toEqual({ object: [ 'graph' ] });
    });
  });

  describe('match', () => {
    it('should throw on RegExp args', async () => {
      return expect(() => source.match(new RegExp('.*')))
        .toThrow(new Error('RdfSourceQpf does not support matching by regular expressions.'));
    });

    it('should return a copy of the initial quads for the empty pattern', async () => {
      return expect(await arrayifyStream(source.match())).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
    });

    it('should emit metadata for the empty pattern', async () => {
      const output = source.match();
      const metadataPromise = new Promise((resolve, reject) => {
        output.on('metadata', resolve);
        output.on('end', () => reject(new Error('No metadata was emitted.')));
      });
      await arrayifyStream(output);
      expect(await metadataPromise).toBe(metadata);
    });

    it('should return a copy of the initial quads for the empty pattern with the default graph', async () => {
      return expect(await arrayifyStream(source.match(
        null, null, null, defaultGraph())))
        .toBeRdfIsomorphic([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]);
    });

    it('should return multiple copies of the initial quads for the empty pattern', async () => {
      expect(await arrayifyStream(source.match())).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      expect(await arrayifyStream(source.match())).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      expect(await arrayifyStream(source.match())).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
    });

    it('should handle a non-empty pattern and filter only matching quads', async () => {
      expect(await arrayifyStream(source.match(
        namedNode('s1'), null, namedNode('o1'))))
        .toBeRdfIsomorphic([
          quad('s1', 'p1', 'o1'),
        ]);
      expect(await arrayifyStream(source.match(
        namedNode('s2'), null, namedNode('o2'))))
        .toBeRdfIsomorphic([
          quad('s2', 'p2', 'o2'),
        ]);
      expect(await arrayifyStream(source.match(
        namedNode('s3'), null, namedNode('o3'))))
        .toBeRdfIsomorphic([]);
    });

    it('should emit metadata for a non-empty pattern', async () => {
      const output = source.match(namedNode('s1'), null, namedNode('o1'));
      const metadataPromise = new Promise((resolve, reject) => {
        output.on('metadata', resolve);
        output.on('end', () => reject(new Error('No metadata was emitted.')));
      });
      await arrayifyStream(output);
      expect(await metadataPromise).toEqual({ next: 'NEXT' });
    });

    it('should handle a pattern with variables that occur multiple times in the pattern', async () => {
      mediatorRdfDereference.mediate = (args) => Promise.resolve({
        url: args.url,
        quads: streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
          quad('t', 'p2', 't'),
        ]),
        triples: false,
      });

      expect(await arrayifyStream(source.match(
        variable('v'), null, variable('v'))))
        .toBeRdfIsomorphic([
          quad('t', 'p2', 't'),
        ]);
    });

    it('should delegate errors from the RDF dereference stream', () => {
      const quads = new Readable();
      quads._read = () => {
        quads.emit('error', error);
      };
      mediatorRdfDereference.mediate = (args) => Promise.resolve({
        url: args.url,
        quads,
        triples: false,
      });

      const error = new Error('a');
      return new Promise((resolve, reject) => {
        const output: RDF.Stream = source.match(S, P, O, G);
        output.on('error', (e) => {
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
        metadata: null,
      });

      const error = new Error('a');
      return new Promise((resolve, reject) => {
        const output: RDF.Stream = source.match(S, P, O, G);
        output.on('error', (e) => {
          expect(e).toEqual(error);
          resolve();
        });
        output.on('data', reject);
        output.on('end', reject);
      });
    });

    it('should ignore errors from the metadata extract mediator', async () => {
      mediatorMetadataExtract.mediate = () => Promise.reject(new Error('abc'));
      return expect(await arrayifyStream(source.match())).toBeRdfIsomorphic([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
    });
  });
});
