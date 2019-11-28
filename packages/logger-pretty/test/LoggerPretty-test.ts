import {LoggerPretty} from "../lib/LoggerPretty";

// tslint:disable:no-console
describe('LoggerPretty', () => {

  beforeEach(() => {
    console.error = jest.fn();
  });

  describe('a LoggerPretty instance on trace level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'trace' });
    });

    it('should log for trace', () => {
      logger.trace('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on debug level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'debug' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on info level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'info' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on warn level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'warn' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on error level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'error' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('a LoggerPretty instance on fatal level', () => {
    let logger: LoggerPretty;

    beforeEach(() => {
      logger = new LoggerPretty({ level: 'fatal' });
    });

    it('should void for trace', () => {
      logger.trace('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for debug', () => {
      logger.debug('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for info', () => {
      logger.info('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for warn', () => {
      logger.warn('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for error', () => {
      logger.error('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(0);
    });

    it('should log for fatal', () => {
      logger.fatal('bla', {});
      return expect(console.error).toHaveBeenCalledTimes(1);
    });
  });
});
