import 'cross-fetch/polyfill';
import { ProxyHandlerStatic } from '../lib/ProxyHandlerStatic';

describe('ProxyHandlerStatic', () => {
  let proxy: any;

  beforeEach(() => {
    proxy = new ProxyHandlerStatic('http://prefix.org/');
  });

  it('should modify a string-based request', async() => {
    expect(await proxy.getProxy({ input: 'http://example.org/' }))
      .toEqual({ input: 'http://prefix.org/http://example.org/' });
  });

  it('should modify a string-based request with init', async() => {
    expect(await proxy.getProxy({ input: 'http://example.org/', init: { a: 'B' }}))
      .toEqual({ input: 'http://prefix.org/http://example.org/', init: { a: 'B' }});
  });

  it('should modify an object-based request', async() => {
    expect(await proxy.getProxy({ input: new Request('http://example.org/') }))
      .toEqual({ input: new Request('http://prefix.org/http://example.org/') });
  });

  it('should modify an object-based request with options', async() => {
    const init = { headers: new Headers({ a: 'b' }) };
    expect(await proxy.getProxy({ input: new Request('http://example.org/', init) }))
      .toEqual({ input: new Request('http://prefix.org/http://example.org/', init) });
  });
});
