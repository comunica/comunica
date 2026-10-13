import { KeysHttp, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { extractUrlCredentials, getServiceTargetCredentials } from '../lib/Credentials';

describe('extractUrlCredentials', () => {
  it('should keep values that are not URLs', () => {
    expect(extractUrlCredentials('user:secret@ex')).toEqual({ url: 'user:secret@ex' });
    expect(extractUrlCredentials('abc')).toEqual({ url: 'abc' });
  });

  it('should keep URLs without credentials', () => {
    expect(extractUrlCredentials('http://example.org/a@b')).toEqual({ url: 'http://example.org/a@b' });
    expect(extractUrlCredentials('http://example.org/sparql?q=a:b@c'))
      .toEqual({ url: 'http://example.org/sparql?q=a:b@c' });
  });

  it('should not normalize URLs', () => {
    expect(extractUrlCredentials('http://user:secret@EXAMPLE.org'))
      .toEqual({ url: 'http://EXAMPLE.org', auth: 'user:secret' });
  });

  it('should extract credentials', () => {
    expect(extractUrlCredentials('http://user:secret@example.org/sparql?a=@#b@'))
      .toEqual({ url: 'http://example.org/sparql?a=@#b@', auth: 'user:secret' });
    expect(extractUrlCredentials('https://user:secret@example.org:8080/a@b'))
      .toEqual({ url: 'https://example.org:8080/a@b', auth: 'user:secret' });
  });

  it('should extract credentials of URLs without path', () => {
    expect(extractUrlCredentials('http://user:secret@example.org?a=b'))
      .toEqual({ url: 'http://example.org?a=b', auth: 'user:secret' });
  });

  it('should extract partial credentials', () => {
    expect(extractUrlCredentials('http://user@example.org/')).toEqual({ url: 'http://example.org/', auth: 'user:' });
    expect(extractUrlCredentials('http://user:@example.org/')).toEqual({ url: 'http://example.org/', auth: 'user:' });
    expect(extractUrlCredentials('http://:secret@example.org/'))
      .toEqual({ url: 'http://example.org/', auth: ':secret' });
  });

  it('should decode credentials', () => {
    expect(extractUrlCredentials('http://us%40er:se%3Acret@example.org/'))
      .toEqual({ url: 'http://example.org/', auth: 'us@er:se:cret' });
    expect(extractUrlCredentials('http://user:se@cret@example.org/'))
      .toEqual({ url: 'http://example.org/', auth: 'user:se@cret' });
  });
});

describe('getServiceTargetCredentials', () => {
  const sources: IQuerySourceWrapper[] = [
    <any> { source: { referenceValue: 'http://example.org/plain' }},
    <any> { source: { referenceValue: 'http://example.org/other' }, context: new ActionContext() },
    <any> {
      source: { referenceValue: 'http://example.org/sparql' },
      context: new ActionContext().set(KeysHttp.auth, 'user:secret'),
    },
  ];
  const context = new ActionContext().set(KeysQueryOperation.querySources, sources);

  it('should handle targets without credentials and without sources', () => {
    expect(getServiceTargetCredentials('http://example.org/sparql', new ActionContext()))
      .toEqual({ url: 'http://example.org/sparql', auth: undefined });
  });

  it('should take credentials from the target', () => {
    expect(getServiceTargetCredentials('http://other:secret@example.org/sparql', context))
      .toEqual({ url: 'http://example.org/sparql', auth: 'other:secret' });
  });

  it('should take credentials from a source with the same url', () => {
    expect(getServiceTargetCredentials('http://example.org/sparql', context))
      .toEqual({ url: 'http://example.org/sparql', auth: 'user:secret' });
  });

  it('should not take credentials from sources with another url', () => {
    expect(getServiceTargetCredentials('http://example.org/sparql2', context))
      .toEqual({ url: 'http://example.org/sparql2', auth: undefined });
  });

  it('should handle sources with the same url without credentials', () => {
    expect(getServiceTargetCredentials('http://example.org/plain', context))
      .toEqual({ url: 'http://example.org/plain', auth: undefined });
    expect(getServiceTargetCredentials('http://example.org/other', context))
      .toEqual({ url: 'http://example.org/other', auth: undefined });
  });
});
