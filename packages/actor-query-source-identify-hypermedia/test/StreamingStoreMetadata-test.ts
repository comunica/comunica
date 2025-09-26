import { Readable } from 'readable-stream';
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

  describe('import', () => {
    it('should be skipped if already ended', () => {
      const store = new StreamingStoreMetadata(
        undefined,
        () => Promise.reject(new Error('StreamingStoreMetadata error')),
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
