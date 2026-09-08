import type { MetadataBindings, MetadataQuads } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { skolemizeBindingsStream, skolemizeQuadStream } from '../lib/utils';
import 'jest-rdf';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('skolemize stream metadata', () => {
  let inner: ArrayIterator<any>;
  let metadata: MetadataBindings;
  let requests: number;

  beforeEach(() => {
    metadata = <any> { cardinality: { type: 'exact', value: 1 }, state: new MetadataValidationState() };
    inner = new ArrayIterator([ BF.fromRecord({ a: DF.blankNode('a1') }) ], { autoStart: false });

    // Count how often the metadata of the inner stream is asked for
    requests = 0;
    const getProperty = inner.getProperty.bind(inner);
    inner.getProperty = <P>(propertyName: string, callback?: (value: P) => void): P | undefined => {
      if (propertyName === 'metadata') {
        requests++;
      }
      return <P | undefined> getProperty(propertyName, callback);
    };
  });

  describe('skolemizeBindingsStream', () => {
    it('should not ask the inner stream for its metadata on its own', () => {
      inner.setProperty('metadata', metadata);
      skolemizeBindingsStream(DF, inner, '0');
      expect(requests).toBe(0);
    });

    it('should ask the inner stream for its metadata once it is requested', async() => {
      inner.setProperty('metadata', metadata);
      const ret = skolemizeBindingsStream(DF, inner, '0');
      await expect(new Promise(resolve => ret.getProperty('metadata', resolve))).resolves.toBe(metadata);
      expect(requests).toBe(1);
    });

    it('should ask the inner stream for its metadata only once', async() => {
      inner.setProperty('metadata', metadata);
      const ret = skolemizeBindingsStream(DF, inner, '0');
      await expect(new Promise(resolve => ret.getProperty('metadata', resolve))).resolves.toBe(metadata);
      await expect(new Promise(resolve => ret.getProperty('metadata', resolve))).resolves.toBe(metadata);
      expect(requests).toBe(1);
    });

    it('should pass through other properties without asking for the metadata', () => {
      const ret = skolemizeBindingsStream(DF, inner, '0');
      ret.setProperty('other', 'OTHER');
      expect(ret.getProperty('other')).toBe('OTHER');
      expect(requests).toBe(0);
    });

    it('should inherit the metadata again after it was invalidated', async() => {
      inner.setProperty('metadata', metadata);
      const ret = skolemizeBindingsStream(DF, inner, '0');
      await expect(new Promise(resolve => ret.getProperty('metadata', resolve))).resolves.toBe(metadata);

      const metadataNew: MetadataBindings = <any> {
        cardinality: { type: 'exact', value: 2 },
        state: new MetadataValidationState(),
      };
      inner.setProperty('metadata', metadataNew);
      metadata.state.invalidate();

      // The stream is asked again for its metadata, which it answers asynchronously
      await expect(new Promise(resolve => ret.getProperty('metadata', resolve))).resolves.toBe(metadataNew);
    });
  });

  describe('skolemizeQuadStream', () => {
    let metadataQuads: MetadataQuads;

    beforeEach(() => {
      metadataQuads = <any> { cardinality: { type: 'exact', value: 1 }, state: new MetadataValidationState() };
      inner = new ArrayIterator([ DF.quad(DF.namedNode('s'), DF.namedNode('p'), DF.blankNode('o')) ], {
        autoStart: false,
      });
      requests = 0;
      const getProperty = inner.getProperty.bind(inner);
      inner.getProperty = <P>(propertyName: string, callback?: (value: P) => void): P | undefined => {
        if (propertyName === 'metadata') {
          requests++;
        }
        return <P | undefined> getProperty(propertyName, callback);
      };
    });

    it('should not ask the inner stream for its metadata on its own', () => {
      inner.setProperty('metadata', metadataQuads);
      skolemizeQuadStream(DF, inner, '0');
      expect(requests).toBe(0);
    });

    it('should ask the inner stream for its metadata once it is requested', async() => {
      inner.setProperty('metadata', metadataQuads);
      const ret = skolemizeQuadStream(DF, inner, '0');
      await expect(new Promise(resolve => ret.getProperty('metadata', resolve))).resolves.toBe(metadataQuads);
      expect(requests).toBe(1);
    });
  });
});
