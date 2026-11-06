import { CliArgsHandlerBase } from '../../lib/cli/CliArgsHandlerBase';

describe('CliArgsHandlerBase', () => {
  describe('getScriptOutput', () => {
    it('should return the fallback for a failing command', async() => {
      await expect(CliArgsHandlerBase.getScriptOutput('acommandthatdefinitelydoesnotexist', 'fallback'))
        .resolves.toBe('fallback');
    });
  });

  describe('getSourceObjectFromString', () => {
    it('should correctly parse normal URL', () => {
      const hypermedia = 'http://example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({ value: 'http://example.org/' });
    });

    it('should work with type annotation', () => {
      const hypermedia = 'qpf@http://example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({ value: 'http://example.org/', type: 'qpf' });
    });

    it('should keep authorization in url', () => {
      const hypermedia = 'http://username:passwd@example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({ value: 'http://username:passwd@example.org/' });
    });

    it('should work with type annotation and keep authorization in url', () => {
      const hypermedia = 'qpf@http://username:passwd@example.org/';
      expect(CliArgsHandlerBase.getSourceObjectFromString(hypermedia))
        .toEqual({ value: 'http://username:passwd@example.org/', type: 'qpf' });
    });
  });
});
