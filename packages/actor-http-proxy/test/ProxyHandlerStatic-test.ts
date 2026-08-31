import { ProxyHandlerStatic } from '../lib/ProxyHandlerStatic';

describe('ProxyHandlerStatic', () => {
  let proxy: any;

  beforeEach(() => {
    proxy = new ProxyHandlerStatic('http://prefix.org/');
  });

  it('should modify a string-based request', async() => {
    await expect(proxy.getProxy({ input: 'http://example.org/' })).resolves
      .toEqual({ input: 'http://prefix.org/http://example.org/' });
  });

  it('should modify a string-based request with init', async() => {
    await expect(proxy.getProxy({ input: 'http://example.org/', init: { a: 'B' }})).resolves
      .toEqual({ input: 'http://prefix.org/http://example.org/', init: { a: 'B' }});
  });

  it('should modify an object-based request', async() => {
    expect((await proxy.getProxy({ input: new Request('http://example.org/') })).input.url)
      .toBe('http://prefix.org/http://example.org/');
  });

  it('should modify an object-based request with options', async() => {
    const init = { headers: new Headers({ a: 'b' }) };
    const rewritten = await proxy.getProxy({ input: new Request('http://example.org/', init) });
    expect(rewritten.input.url).toBe('http://prefix.org/http://example.org/');
    expect(rewritten.input.headers.get('a')).toBe('b');
  });
});
