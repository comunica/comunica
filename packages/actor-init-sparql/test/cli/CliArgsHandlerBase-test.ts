import { KeysHttp } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import { CliArgsHandlerBase } from '../../lib/cli/CliArgsHandlerBase';

describe('CliArgsHandlerBase', () => {
  describe('getScriptOutput', () => {
    it('should return the fallback for a failing command', () => {
      return expect(CliArgsHandlerBase.getScriptOutput('acommandthatdefinitelydoesnotexist', 'fallback'))
        .resolves.toEqual('fallback');
    });
  });

  describe('getSourceObjectFromString', () => {
    it('should correctly parse normal URL', () => {
      const hypermedia = 'http://example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({ value: 'http://example.org/' });
    });

    it('should work with type annotation', () => {
      const hypermedia = 'hypermedia@http://example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({ value: 'http://example.org/', type: 'hypermedia' });
    });

    it('should work with authorization in url', () => {
      const hypermedia = 'http://username:passwd@example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({
          value: 'http://example.org/',
          context: new ActionContext({ [KeysHttp.auth.name]: 'username:passwd' }),
        });
    });

    it('should work with type annotation and authorization in url', () => {
      const hypermedia = 'hypermedia@http://username:passwd@example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({ value: 'http://example.org/',
          type: 'hypermedia',
          context: new ActionContext({ [KeysHttp.auth.name]: 'username:passwd' }) });
    });

    it('should work with empty username in authorization in url', () => {
      const hypermedia = 'http://:passwd@example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({ value: 'http://example.org/',
          context: new ActionContext({ [KeysHttp.auth.name]: ':passwd' }) });
    });

    it('should work with empty password in authorization in url', () => {
      const hypermedia = 'http://username:@example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({ value: 'http://example.org/',
          context: new ActionContext({ [KeysHttp.auth.name]: 'username:' }) });
    });
  });
});
