import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { skolemizeBindingsStream, skolemizeQuadStream } from '../lib';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('utils', () => {
  describe('skolemizeQuadStream', () => {
    let inner: ArrayIterator<RDF.Quad>;
    beforeEach(() => {
      inner = new ArrayIterator([
        DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.blankNode('o')),
      ], { autoStart: false });
    });

    it('should inherit metadata lazily upon the first request', async() => {
      const state = new MetadataValidationState();
      inner.setProperty('metadata', { state, cardinality: { type: 'exact', value: 1 }});
      const out = skolemizeQuadStream(DF, inner, '0');
      await expect(new Promise(resolve => out.getProperty('metadata', resolve))).resolves
        .toEqual(expect.objectContaining({ cardinality: { type: 'exact', value: 1 }}));
    });

    it('should re-inherit metadata upon invalidation', async() => {
      const state = new MetadataValidationState();
      inner.setProperty('metadata', { state, cardinality: { type: 'exact', value: 1 }});
      const out = skolemizeQuadStream(DF, inner, '0');
      await expect(new Promise(resolve => out.getProperty('metadata', resolve))).resolves
        .toEqual(expect.objectContaining({ cardinality: { type: 'exact', value: 1 }}));

      inner.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: 2 },
      });
      state.invalidate();
      await new Promise(resolve => setImmediate(resolve));
      await expect(new Promise(resolve => out.getProperty('metadata', resolve))).resolves
        .toEqual(expect.objectContaining({ cardinality: { type: 'exact', value: 2 }}));
    });
  });

  describe('skolemizeBindingsStream', () => {
    let inner: ArrayIterator<RDF.Bindings>;
    beforeEach(() => {
      inner = new ArrayIterator<RDF.Bindings>([
        <RDF.Bindings> BF.fromRecord({ a: DF.blankNode('a0') }),
      ], { autoStart: false });
    });

    it('should inherit metadata lazily upon the first request', async() => {
      const state = new MetadataValidationState();
      inner.setProperty('metadata', { state, cardinality: { type: 'exact', value: 1 }});
      const out = skolemizeBindingsStream(DF, inner, '0');
      await expect(new Promise(resolve => out.getProperty('metadata', resolve))).resolves
        .toEqual(expect.objectContaining({ cardinality: { type: 'exact', value: 1 }}));
    });

    it('should re-inherit metadata upon invalidation', async() => {
      const state = new MetadataValidationState();
      inner.setProperty('metadata', { state, cardinality: { type: 'exact', value: 1 }});
      const out = skolemizeBindingsStream(DF, inner, '0');
      await expect(new Promise(resolve => out.getProperty('metadata', resolve))).resolves
        .toEqual(expect.objectContaining({ cardinality: { type: 'exact', value: 1 }}));

      inner.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: 2 },
      });
      state.invalidate();
      await new Promise(resolve => setImmediate(resolve));
      await expect(new Promise(resolve => out.getProperty('metadata', resolve))).resolves
        .toEqual(expect.objectContaining({ cardinality: { type: 'exact', value: 2 }}));
    });
  });
});
