import { StreamingStoreMetadata } from '../lib/StreamingStoreMetadata';

describe('StreamingStoreMetadata', () => {
  describe('setBaseMetadata', () => {
    it('should ignore metadataAccumulator rejections', () => {
      const store = new StreamingStoreMetadata(
        undefined,
        () => Promise.reject(new Error('StreamingStoreMetadata error')),
        true,
      );
      const _it1 = store.match();
      store.setBaseMetadata(<any>{}, true);
    });
  });
});
