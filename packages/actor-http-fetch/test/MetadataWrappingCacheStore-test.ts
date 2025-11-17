import CacheHandler from 'undici/types/cache-interceptor';
import { MetadataWrappingCacheStore } from '../lib/MetadataWrappingCacheStore';
import CacheStore = CacheHandler.CacheStore;

describe('MetadataWrappingCacheStore', () => {
  let wrapped: CacheStore;
  let wrapper: MetadataWrappingCacheStore;
  beforeEach(() => {
    wrapped = <CacheStore> <any> {
      get: jest.fn(() => {
        return { headers: { a: 'b' }};
      }),
      createWriteStream: jest.fn(() => 'WS'),
      delete: jest.fn(),
    };
    wrapper = new MetadataWrappingCacheStore(wrapped);
  });

  it('delegates get', async() => {
    await expect(wrapper.get({
      origin: 'O',
      path: 'P',
      method: 'GET',
    })).resolves.toEqual({ headers: { a: 'b', 'x-comunica-cache': 'HIT' }});
    expect(wrapped.get).toHaveBeenCalledWith({
      origin: 'O',
      path: 'P',
      method: 'GET',
    });
  });

  it('delegates createWriteStream', async() => {
    expect(wrapper.createWriteStream({
      origin: 'O',
      path: 'P',
      method: 'GET',
    }, <any> 'VAL')).toBe('WS');
    expect(wrapped.createWriteStream).toHaveBeenCalledWith({
      origin: 'O',
      path: 'P',
      method: 'GET',
    }, 'VAL');
  });

  it('delegates delete', async() => {
    await wrapper.delete({
      origin: 'O',
      path: 'P',
      method: 'GET',
    });
    expect(wrapped.delete).toHaveBeenCalledWith({
      origin: 'O',
      path: 'P',
      method: 'GET',
    });
  });
});
