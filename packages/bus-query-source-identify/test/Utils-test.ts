import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { Factory } from 'sparqlalgebrajs';
import {
  filterMatchingQuotedQuads,
  getDuplicateElementLinks,
  getVariables,
  isTermVariable,
  quadsMetadataToBindingsMetadata,
  quadsOrderToBindingsOrder,
  quadsToBindings,
} from '../lib';
import '@comunica/utils-jest';
import 'jest-rdf';

const quad = require('rdf-quad');

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const AF = new Factory();

describe('Utils', () => {
  describe('quadsToBindings', () => {
    it('converts triples', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 'p3', 'o3'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'asc' },
          { term: 'graph', direction: 'asc' },
        ],
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
        ],
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
        ],
      });
    });

    it('converts triples without order metadata', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 'p3', 'o3'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'exact', value: 3 },
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
        ],
      });
    });

    it('converts triples with available orders metadata', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 'p3', 'o3'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        availableOrders: [
          {
            cost: {
              cardinality: { type: 'exact', value: 123 },
              iterations: 1,
              persistedItems: 2,
              blockingItems: 3,
              requestTime: 4,
            },
            terms: [
              { term: 'subject', direction: 'asc' },
              { term: 'predicate', direction: 'asc' },
            ],
          },
          {
            cost: {
              cardinality: { type: 'exact', value: 456 },
              iterations: 1,
              persistedItems: 2,
              blockingItems: 3,
              requestTime: 4,
            },
            terms: [
              { term: 'object', direction: 'desc' },
              { term: 'graph', direction: 'desc' },
            ],
          },
        ],
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'exact', value: 3 },
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
        ],
        availableOrders: [
          {
            cost: {
              blockingItems: 3,
              cardinality: {
                type: 'exact',
                value: 123,
              },
              iterations: 1,
              persistedItems: 2,
              requestTime: 4,
            },
            terms: [
              {
                direction: 'asc',
                term: {
                  termType: 'Variable',
                  value: 'p',
                },
              },
            ],
          },
          {
            cost: {
              blockingItems: 3,
              cardinality: {
                type: 'exact',
                value: 456,
              },
              iterations: 1,
              persistedItems: 2,
              requestTime: 4,
            },
            terms: [],
          },
        ],
      });
    });

    it('converts quads', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2', 'g1'),
        quad('s3', 'p3', 'o3', 'g2'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'asc' },
          { term: 'graph', direction: 'asc' },
        ],
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.variable('g'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p2'),
          g: DF.namedNode('g1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
          g: DF.namedNode('g2'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
          { term: DF.variable('g'), direction: 'asc' },
        ],
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
          { variable: DF.variable('g'), canBeUndef: false },
        ],
      });
    });

    it('converts quads with union default graph', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2', 'g1'),
        quad('s3', 'p3', 'o3', 'g2'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'asc' },
          { term: 'graph', direction: 'asc' },
        ],
      });
      const pattern = AF.createPattern(
        DF.namedNode('s'),
        DF.variable('p'),
        DF.namedNode('o'),
        DF.variable('g'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, true);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          p: DF.namedNode('p1'),
          g: DF.defaultGraph(),
        }),
        BF.fromRecord({
          p: DF.namedNode('p2'),
          g: DF.namedNode('g1'),
        }),
        BF.fromRecord({
          p: DF.namedNode('p3'),
          g: DF.namedNode('g2'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: DF.variable('p'), direction: 'asc' },
          { term: DF.variable('g'), direction: 'asc' },
        ],
        variables: [
          { variable: DF.variable('p'), canBeUndef: false },
          { variable: DF.variable('g'), canBeUndef: false },
        ],
      });
    });

    it('converts triples with duplicate variables', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 's1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 's1', 'o3'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
        order: [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'asc' },
          { term: 'graph', direction: 'asc' },
        ],
      });
      const pattern = AF.createPattern(
        DF.variable('x'),
        DF.variable('x'),
        DF.namedNode('o'),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          x: DF.namedNode('s1'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'estimate', value: 3 },
        order: [
          { term: DF.variable('x'), direction: 'asc' },
        ],
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
        ],
      });
    });

    it('converts quoted triples with duplicate variables', async() => {
      // Prepare data
      const quadStream = new ArrayIterator([
        quad('s1', 'p1', '<<<o1s> <o1p> <o1o>>>'),
        quad('s2', 'p2', '<<<o2s> <o2p> <s2>>>'),
        quad('s3', 'p3', '<<<o3s> <o3p> <o3o>>>'),
      ], { autoStart: false });
      quadStream.setProperty('metadata', {
        cardinality: { type: 'exact', value: 3 },
      });
      const pattern = AF.createPattern(
        DF.variable('x'),
        DF.variable('p'),
        DF.quad(DF.variable('os'), DF.variable('op'), DF.variable('x')),
      );
      const bindingsStream = quadsToBindings(quadStream, pattern, DF, BF, false);

      // Check results
      await expect(bindingsStream).toEqualBindingsStream([
        BF.fromRecord({
          x: DF.namedNode('s2'),
          p: DF.namedNode('p2'),
          os: DF.namedNode('o2s'),
          op: DF.namedNode('o2p'),
        }),
      ]);

      // Check metadata
      const metadata = await new Promise(resolve => bindingsStream.getProperty('metadata', resolve));
      expect(metadata).toEqual({

        cardinality: { type: 'estimate', value: 3 },
        variables: [
          { variable: DF.variable('x'), canBeUndef: false },
          { variable: DF.variable('p'), canBeUndef: false },
          { variable: DF.variable('os'), canBeUndef: false },
          { variable: DF.variable('op'), canBeUndef: false },
        ],
      });
    });
  });

  describe('isTermVariable', () => {
    it('should be true for a variable', () => {
      expect(isTermVariable(DF.variable('v'))).toBeTruthy();
    });

    it('should be false for a blank node', () => {
      expect(isTermVariable(DF.blankNode())).toBeFalsy();
    });

    it('should be false for a named node', () => {
      expect(isTermVariable(DF.namedNode('n'))).toBeFalsy();
    });

    it('should be false for a quoted triple', () => {
      expect(isTermVariable(DF.quad(
        DF.namedNode('iri'),
        DF.namedNode('iri'),
        DF.namedNode('iri'),
      ))).toBeFalsy();
    });
  });

  describe('getVariables', () => {
    it('should get variables from a pattern', () => {
      expect(getVariables(
        AF.createPattern(DF.variable('v1'), DF.variable('v2'), DF.variable('v3')),
      )).toEqual([ DF.variable('v1'), DF.variable('v2'), DF.variable('v3') ]);
    });

    it('should get variables from a mixed pattern', () => {
      expect(getVariables(
        AF.createPattern(DF.namedNode('s1'), DF.namedNode('p'), DF.variable('v3')),
      )).toEqual([ DF.variable('v3') ]);
    });

    it('should get unique variables from a pattern', () => {
      expect(getVariables(
        AF.createPattern(DF.variable('v'), DF.variable('v'), DF.variable('v')),
      )).toEqual([ DF.variable('v') ]);
    });

    it('should get variables from a nested pattern', () => {
      expect(getVariables(
        AF.createPattern(DF.variable('v1'), DF.namedNode('p1'), DF.quad(
          DF.namedNode('s2'),
          DF.namedNode('p2'),
          DF.variable('v2'),
        )),
      )).toEqual([ DF.variable('v1'), DF.variable('v2') ]);
    });
  });

  describe('getDuplicateElementLinks', () => {
    it('should return falsy on patterns with different elements', () => {
      expect(getDuplicateElementLinks(quad('s', 'p', 'o', 'g')))
        .toBeFalsy();
    });

    it('should return falsy on patterns with different variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v4')))
        .toBeFalsy();
    });

    it('should return falsy on patterns when blank nodes and variables have the same value', () => {
      expect(getDuplicateElementLinks(quad('?v1', '_:v1', '?v3', '?v4')))
        .toBeFalsy();
    });

    it('should return correctly on patterns with equal subject and predicate variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v1', '?v3', '?v4')))
        .toEqual({ subject: [[ 'predicate' ]]});
    });

    it('should ignore patterns with equal subject and predicate blank nodes', () => {
      expect(getDuplicateElementLinks(quad('_:v1', '_:v1', '?v3', '?v4')))
        .toBeUndefined();
    });

    it('should return correctly on patterns with equal subject and object variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v1', '?v4')))
        .toEqual({ subject: [[ 'object' ]]});
    });

    it('should return correctly on patterns with equal subject and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v1')))
        .toEqual({ subject: [[ 'graph' ]]});
    });

    it('should return correctly on patterns with equal subject, predicate and object variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v1', '?v1', '?v4')))
        .toEqual({ subject: [[ 'predicate' ], [ 'object' ]]});
    });

    it('should return correctly on patterns with equal subject, predicate and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v1', '?v3', '?v1')))
        .toEqual({ subject: [[ 'predicate' ], [ 'graph' ]]});
    });

    it('should return correctly on patterns with equal subject, object and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v1', '?v1')))
        .toEqual({ subject: [[ 'object' ], [ 'graph' ]]});
    });

    it('should return correctly on patterns with equal subject, predicate, object and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v1', '?v1', '?v1')))
        .toEqual({ subject: [[ 'predicate' ], [ 'object' ], [ 'graph' ]]});
    });

    it('should return correctly on patterns with equal predicate and object variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v2', '?v4')))
        .toEqual({ predicate: [[ 'object' ]]});
    });

    it('should return correctly on patterns with equal predicate and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v2')))
        .toEqual({ predicate: [[ 'graph' ]]});
    });

    it('should return correctly on patterns with equal predicate, object and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v2', '?v2')))
        .toEqual({ predicate: [[ 'object' ], [ 'graph' ]]});
    });

    it('should return correctly on patterns with equal object and graph variables', () => {
      expect(getDuplicateElementLinks(quad('?v1', '?v2', '?v3', '?v3')))
        .toEqual({ object: [[ 'graph' ]]});
    });

    it('should return correctly on quoted patterns with equal SP and OP variables', () => {
      expect(getDuplicateElementLinks(quad('<<ex:s ?v1 ex:o>>', '?v2', '<<ex:s ?v1 ex:o>>', '?v4')))
        .toEqual({ subject_predicate: [[ 'object', 'predicate' ]]});
    });

    it('should return correctly on quoted patterns with equal SP, PO and OP variables', () => {
      expect(getDuplicateElementLinks(
        quad('<<ex:s ?v1 ex:o>>', '<<ex:s ex:p ?v1>>', '<<ex:s ?v1 ex:o>>', '?v4'),
      ))
        .toEqual({ subject_predicate: [[ 'predicate', 'object' ], [ 'object', 'predicate' ]]});
    });

    it('should return correctly on quoted patterns with equal SP and OP, and P and G variables', () => {
      expect(getDuplicateElementLinks(quad('<<ex:s ?v1 ex:o>>', '?v2', '<<ex:s ?v1 ex:o>>', '?v2')))
        .toEqual({ subject_predicate: [[ 'object', 'predicate' ]], predicate: [[ 'graph' ]]});
    });
  });

  describe('quadsMetadataToBindingsMetadata', () => {
    it('translates quad metadata', () => {
      expect(quadsMetadataToBindingsMetadata(
        DF,
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
        },
        {
          subject: 'a',
        },
        [
          DF.variable('a'),
        ],
      )).toEqual({
        state: expect.any(MetadataValidationState),

        cardinality: { type: 'estimate', value: 10 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
        ],
      });
    });

    it('translates quad metadata with optional fields', () => {
      expect(quadsMetadataToBindingsMetadata(
        DF,
        {
          state: new MetadataValidationState(),
          cardinality: { type: 'estimate', value: 10 },
          order: [{ term: 'subject', direction: 'asc' }],
          availableOrders: [
            {
              cost: {
                iterations: 10,
                persistedItems: 11,
                blockingItems: 12,
                requestTime: 13,
              },
              terms: [{ term: 'predicate', direction: 'asc' }],
            },
          ],
        },
        {
          subject: 'a',
          predicate: 'b',
        },
        [
          DF.variable('a'),
          DF.variable('b'),
        ],
      )).toEqual({
        state: expect.any(MetadataValidationState),

        cardinality: { type: 'estimate', value: 10 },
        variables: [
          { variable: DF.variable('a'), canBeUndef: false },
          { variable: DF.variable('b'), canBeUndef: false },
        ],
        order: [{ term: DF.variable('a'), direction: 'asc' }],
        availableOrders: [
          {
            cost: {
              iterations: 10,
              persistedItems: 11,
              blockingItems: 12,
              requestTime: 13,
            },
            terms: [{ term: DF.variable('b'), direction: 'asc' }],
          },
        ],
      });
    });
  });

  describe('quadsOrderToBindingsOrder', () => {
    it('handles a single order', () => {
      expect(quadsOrderToBindingsOrder(
        DF,
        [{ term: 'subject', direction: 'asc' }],
        { subject: 'a' },
      )).toEqual([{ term: DF.variable('a'), direction: 'asc' }]);
    });

    it('handles multiple orders', () => {
      expect(quadsOrderToBindingsOrder(
        DF,
        [
          { term: 'subject', direction: 'asc' },
          { term: 'object', direction: 'desc' },
        ],
        {
          subject: 'a',
          object: 'c',
        },
      )).toEqual([
        { term: DF.variable('a'), direction: 'asc' },
        { term: DF.variable('c'), direction: 'desc' },
      ]);
    });

    it('omits non-applicable quad orders', () => {
      expect(quadsOrderToBindingsOrder(
        DF,
        [
          { term: 'subject', direction: 'asc' },
          { term: 'predicate', direction: 'asc' },
          { term: 'object', direction: 'desc' },
        ],
        {
          subject: 'a',
          object: 'c',
          graph: 'd',
        },
      )).toEqual([
        { term: DF.variable('a'), direction: 'asc' },
        { term: DF.variable('c'), direction: 'desc' },
      ]);
    });
  });

  describe('filterMatchingQuotedQuads', () => {
    it('should not filter for non-quad terms', () => {
      const itIn: AsyncIterator<RDF.Quad> = new ArrayIterator([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
        quad('s3', 'p3', 'o3'),
      ], { autoStart: false });
      const itOut = filterMatchingQuotedQuads(
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.namedNode('o')),
        itIn,
      );
      expect(itOut).toBe(itIn);
    });

    it('should filter for quad terms', async() => {
      const itIn: AsyncIterator<RDF.Quad> = new ArrayIterator([
        quad('s1', 'p1', '<<o1s o1p o>>'),
        quad('s2', 'p2', '<<o2s o2p o2>>'),
        quad('s3', 'p3', '<<o3s o3p o3>>'),
      ], { autoStart: false });
      const itOut = filterMatchingQuotedQuads(
        DF.quad(
          DF.variable('s1'),
          DF.variable('p1'),
          DF.quad(DF.variable('o1s'), DF.variable('o1p'), DF.namedNode('o')),
        ),
        itIn,
      );
      expect(itOut).not.toBe(itIn);
      await expect(itOut.toArray()).resolves.toBeRdfIsomorphic([
        quad('s1', 'p1', '<<o1s o1p o>>'),
      ]);
    });

    it('should filter for quad terms with common variables', async() => {
      const itIn: AsyncIterator<RDF.Quad> = new ArrayIterator([
        quad('s1', 'p1', '<<o1s o1p o>>'),
        quad('s2', 'p2', '<<a o2p a>>'),
        quad('s3', 'p3', '<<o3s o3p o3>>'),
      ], { autoStart: false });
      const itOut = filterMatchingQuotedQuads(
        DF.quad(
          DF.variable('s1'),
          DF.variable('p1'),
          DF.quad(DF.variable('x'), DF.variable('o1p'), DF.variable('x')),
        ),
        itIn,
      );
      expect(itOut).not.toBe(itIn);
      await expect(itOut.toArray()).resolves.toBeRdfIsomorphic([
        quad('s2', 'p2', '<<a o2p a>>'),
      ]);
    });
  });
});
