import { LoggerBunyan } from '../lib/LoggerBunyan';
import { BunyanStreamProviderStderr } from '../lib/stream/BunyanStreamProviderStderr';

jest.mock<typeof import('bunyan')>('bunyan', () => {
  return <any>{
    createLogger: (args: any) => ({
      ...args,
      trace: jest.fn(() => null),
      debug: jest.fn(() => null),
      info: jest.fn(() => null),
      warn: jest.fn(() => null),
      error: jest.fn(() => null),
      fatal: jest.fn(() => null),
    }),
  };
});

describe('LoggerBunyan', () => {
  it('should create streams from providers during construction', () => {
    const myProvider = new BunyanStreamProviderStderr({ name: 'def', level: 'warn' });
    jest.spyOn(myProvider, 'createStream');
    const myLogger = new LoggerBunyan({ name: 'abc', streamProviders: [ myProvider ]});
    expect(myProvider.createStream).toHaveBeenCalledTimes(1);
    expect((<any> myLogger).bunyanLogger.streams).toEqual([ myProvider.createStream() ]);
  });

  describe('a LoggerBunyan instance', () => {
    let logger: LoggerBunyan;

    beforeEach(() => {
      logger = new LoggerBunyan({ name: 'abc', a: 'a', b: 'b', streamProviders: []});
    });

    it('should pass all args except for streamProviders', () => {
      expect((<any> logger).bunyanLogger.name).toBe('abc');
      expect((<any> logger).bunyanLogger.a).toBe('a');
      expect((<any> logger).bunyanLogger.b).toBe('b');
      expect((<any> logger).bunyanLogger.streamProviders).toEqual([]);
    });

    it('should forward trace', () => {
      logger.trace('bla', {});
      expect((<any> logger).bunyanLogger.trace).toHaveBeenCalledTimes(1);
    });

    it('should forward debug', () => {
      logger.debug('bla', {});
      expect((<any> logger).bunyanLogger.debug).toHaveBeenCalledTimes(1);
    });

    it('should forward info', () => {
      logger.info('bla', {});
      expect((<any> logger).bunyanLogger.info).toHaveBeenCalledTimes(1);
    });

    it('should forward warn', () => {
      logger.warn('bla', {});
      expect((<any> logger).bunyanLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('should forward error', () => {
      logger.error('bla', {});
      expect((<any> logger).bunyanLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should forward fatal', () => {
      logger.fatal('bla', {});
      expect((<any> logger).bunyanLogger.fatal).toHaveBeenCalledTimes(1);
    });
  });
});
