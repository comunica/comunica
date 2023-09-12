import { LoggerBunyan } from '../lib/LoggerBunyan';
import { BunyanStreamProviderStderr } from '../lib/stream/BunyanStreamProviderStderr';

jest.mock('bunyan', () => {
  return {
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
      expect((<any> logger).bunyanLogger.name).toEqual('abc');
      expect((<any> logger).bunyanLogger.a).toEqual('a');
      expect((<any> logger).bunyanLogger.b).toEqual('b');
      expect((<any> logger).bunyanLogger.streamProviders).toEqual([]);
    });

    it('should forward trace', () => {
      logger.trace('bla', {});
      return expect((<any> logger).bunyanLogger.trace).toHaveBeenCalledTimes(1);
    });

    it('should forward debug', () => {
      logger.debug('bla', {});
      return expect((<any> logger).bunyanLogger.debug).toHaveBeenCalledTimes(1);
    });

    it('should forward info', () => {
      logger.info('bla', {});
      return expect((<any> logger).bunyanLogger.info).toHaveBeenCalledTimes(1);
    });

    it('should forward warn', () => {
      logger.warn('bla', {});
      return expect((<any> logger).bunyanLogger.warn).toHaveBeenCalledTimes(1);
    });

    it('should forward error', () => {
      logger.error('bla', {});
      return expect((<any> logger).bunyanLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should forward fatal', () => {
      logger.fatal('bla', {});
      return expect((<any> logger).bunyanLogger.fatal).toHaveBeenCalledTimes(1);
    });
  });
});
