import { LoggerPretty } from '../lib/LoggerPretty';

describe('LoggerPretty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process.stderr, 'write').mockImplementation();
  });

  it('should work on complex values', () => {
    const logger = new LoggerPretty({ level: 'trace' });
    logger.trace('bla', { foo: BigInt(1) });
    expect(process.stderr.write).toHaveBeenCalledTimes(1);
  });

  it('should work on recursive struct', () => {
    const logger = new LoggerPretty({ level: 'trace' });
    const d: any = { foo: 'bar' };
    d.rec = d;
    logger.trace('bla', d);
    expect(process.stderr.write).toHaveBeenCalledTimes(1);
  });

  describe('a LoggerPretty instance on trace level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'trace' });
    });

    it('should log for trace', () => {
      logger.trace('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for trace for undefined data', () => {
      logger.trace('bla');
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for trace even when an actor id is set', () => {
      logger.trace('bla', { actor: 'abc' });
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on debug level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'debug' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on info level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'info' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on warn level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'warn' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on error level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'error' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on fatal level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'fatal' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(0);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance with an actor whitelist', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      const actors = {
        a: true,
        b: true,
        c: false,
      };
      logger = new LoggerPretty({ level: 'trace', actors });
    });

    it('should log for a whitelisted actor', () => {
      logger.trace('bla', { actor: 'a' });
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for another whitelisted actor', () => {
      logger.trace('bla', { actor: 'b' });
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should not log for a non-whitelisted actor', () => {
      logger.trace('bla', { actor: 'c' });
      expect(process.stderr.write).not.toHaveBeenCalledTimes(1);
    });

    it('should not log for another non-whitelisted actor', () => {
      logger.trace('bla', { actor: 'd' });
      expect(process.stderr.write).not.toHaveBeenCalledTimes(1);
    });

    it('should log for empty data', () => {
      logger.trace('bla', {});
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });

    it('should log for undefined data', () => {
      logger.trace('bla');
      expect(process.stderr.write).toHaveBeenCalledTimes(1);
    });
  });
});
