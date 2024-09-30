import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { cachifyMetadata, getMetadataBindings, getMetadataQuads, MetadataValidationState } from '../lib';

describe('Utils', () => {
  describe('getMetadataQuads', () => {
    it('resolves for valid metadata', async() => {
      const it = new ArrayIterator<RDF.Quad>([], { autoStart: false });
      it.setProperty('metadata', { cardinality: { value: 10 }});
      await expect(getMetadataQuads(it)()).resolves
        .toEqual({ cardinality: { value: 10 }});
    });

    it('resolves multiple times for valid metadata', async() => {
      const it = new ArrayIterator<RDF.Quad>([], { autoStart: false });
      it.setProperty('metadata', { cardinality: { value: 10 }});
      const cb = getMetadataQuads(it);
      await expect(cb()).resolves
        .toEqual({ cardinality: { value: 10 }});
      await expect(cb()).resolves
        .toEqual({ cardinality: { value: 10 }});
      await expect(cb()).resolves
        .toEqual({ cardinality: { value: 10 }});
    });

    it('handles metadata invalidation', async() => {
      const it = new ArrayIterator<RDF.Quad>([], { autoStart: false });
      const metadata1 = { cardinality: { value: 10 }, state: new MetadataValidationState() };
      it.setProperty('metadata', metadata1);
      const cb = getMetadataQuads(it);
      await expect(cb()).resolves
        .toEqual({ cardinality: { value: 10 }, state: expect.anything() });
      await expect(cb()).resolves
        .toEqual({ cardinality: { value: 10 }, state: expect.anything() });
      const metadata2 = { cardinality: { value: 20 }, state: new MetadataValidationState() };
      it.setProperty('metadata', metadata2);
      metadata1.state.invalidate();
      await expect(cb()).resolves
        .toEqual({ cardinality: { value: 20 }, state: expect.anything() });
      await expect(cb()).resolves
        .toEqual({ cardinality: { value: 20 }, state: expect.anything() });
    });

    it('resolves for slow metadata', async() => {
      const it = new ArrayIterator<RDF.Quad>([], { autoStart: false });
      setImmediate(() => it.setProperty('metadata', { cardinality: { value: 10 }}));
      await expect(getMetadataQuads(it)()).resolves
        .toEqual({ cardinality: { value: 10 }});
    });

    it('rejects for an erroring stream', async() => {
      const it = new ArrayIterator<RDF.Quad>([], { autoStart: false });
      setImmediate(() => it.emit('error', new Error('getMetadataQuads error')));
      await expect(getMetadataQuads(it)()).rejects.toThrow(`getMetadataQuads error`);
    });

    it('rejects for incomplete metadata', async() => {
      const it = new ArrayIterator<RDF.Quad>([], { autoStart: false });
      setImmediate(() => it.setProperty('metadata', {}));
      await expect(getMetadataQuads(it)()).rejects.toThrow(`Invalid metadata: missing cardinality in {}`);
    });
  });

  describe('getMetadataBindings', () => {
    it('resolves for valid metadata', async() => {
      const it = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
      it.setProperty('metadata', { cardinality: { value: 10 }, variables: []});
      await expect(getMetadataBindings(it)()).resolves
        .toEqual({ cardinality: { value: 10 }, variables: []});
    });

    it('resolves for slow metadata', async() => {
      const it = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
      setImmediate(() => it.setProperty('metadata', { cardinality: { value: 10 }, variables: []}));
      await expect(getMetadataBindings(it)()).resolves
        .toEqual({ cardinality: { value: 10 }, variables: []});
    });

    it('rejects for an erroring stream', async() => {
      const it = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
      setImmediate(() => it.emit('error', new Error('getMetadataBindings error')));
      await expect(getMetadataBindings(it)()).rejects.toThrow(`getMetadataBindings error`);
    });

    it('rejects for incomplete metadata', async() => {
      const it = new ArrayIterator<RDF.Bindings>([], { autoStart: false });
      setImmediate(() => it.setProperty('metadata', {}));
      await expect(getMetadataBindings(it)()).rejects.toThrow(`Invalid metadata: missing cardinality in {}`);
    });
  });

  describe('#cachifyMetadata', () => {
    it('should remember an instance', async() => {
      let counter = 0;
      const cb = jest.fn(async() => ({ state: new MetadataValidationState(), value: counter++ }));
      const cached = cachifyMetadata(<any> cb);
      expect((await cached()).value).toBe(0);
      expect((await cached()).value).toBe(0);
      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('should handle invalidation', async() => {
      let counter = 0;
      const state = new MetadataValidationState();
      const cb = jest.fn(async() => ({ state, value: counter++ }));
      const cached = cachifyMetadata(<any> cb);
      expect((await cached()).value).toBe(0);
      expect((await cached()).value).toBe(0);
      expect(cb).toHaveBeenCalledTimes(1);

      state.invalidate();
      expect((await cached()).value).toBe(1);
      expect((await cached()).value).toBe(1);
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });
});
