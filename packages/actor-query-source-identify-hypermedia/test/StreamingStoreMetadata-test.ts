import { Readable } from 'readable-stream';
import { AggregatedStoreMemory } from '@comunica/actor-aggregated-store-factory-memory/lib/AggregatedStoreMemory';

describe('StreamingStoreMetadata', () => {
  describe('setBaseMetadata', () => {
    it('should ignore metadataAccumulator rejections', () => {
      const store = new AggregatedStoreMemory(
        undefined,
        () => Promise.reject(new Error('AggregatedStoreMemory error')),
        true,
      );
      const _it1 = store.match();
      store.setBaseMetadata(<any>{}, true);
    });
  });

  describe('import', () => {
    it('should be skipped if already ended', () => {
      const store = new AggregatedStoreMemory(
        undefined,
        () => Promise.reject(new Error('AggregatedStoreMemory error')),
        true,
      );
      const readable = Readable.from([]);
      const spy = jest.spyOn(readable, 'on');
      store.end();
      store.import(readable);
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
