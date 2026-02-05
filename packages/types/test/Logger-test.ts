import { Logger } from '../lib/Logger';

class LoggerMock extends Logger {
  public trace(_message: string, _data?: any) {}
  public debug(_message: string, _data?: any) {}
  public info(_message: string, _data?: any) {}
  public warn(_message: string, _data?: any) {}
  public error(_message: string, _data?: any) {}
  public fatal(_message: string, _data?: any) {}
}

describe('Logger', () => {
  describe('#getLevelOrdinal', () => {
    it('should return 0 for trace', () => {
      expect(Logger.getLevelOrdinal('trace')).toBe(0);
    });

    it('should return 1 for debug', () => {
      expect(Logger.getLevelOrdinal('debug')).toBe(1);
    });

    it('should return 2 for info', () => {
      expect(Logger.getLevelOrdinal('info')).toBe(2);
    });

    it('should return 3 for warn', () => {
      expect(Logger.getLevelOrdinal('warn')).toBe(3);
    });

    it('should return 4 for error', () => {
      expect(Logger.getLevelOrdinal('error')).toBe(4);
    });

    it('should return 5 for fatal', () => {
      expect(Logger.getLevelOrdinal('fatal')).toBe(5);
    });

    it('should return falsy for unknown', () => {
      expect(Logger.getLevelOrdinal('unknown')).toBeFalsy();
    });
  });

  describe('#logGrouped', () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new LoggerMock();
    });

    it('should emit the first message immediately', () => {
      const emit = jest.fn();
      logger.logGrouped('warn', emit);
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith(1);
    });

    it('should buffer subsequent messages', () => {
      const emit = jest.fn();
      logger.logGrouped('warn', emit);
      logger.logGrouped('warn', emit);
      logger.logGrouped('warn', emit);
      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith(1);
    });

    it('should flush pending messages', () => {
      const emit = jest.fn();
      logger.logGrouped('warn', emit);
      logger.logGrouped('warn', emit);
      logger.logGrouped('warn', emit);

      logger.flush();
      expect(emit).toHaveBeenCalledTimes(2);
      expect(emit).toHaveBeenNthCalledWith(2, 2);
    });

    it('should handle interleaving messages within limit', () => {
      const emitA = jest.fn();
      const emitB = jest.fn();

      logger.logGrouped('A', emitA);

      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);

      logger.logGrouped('A', emitA);

      expect(emitA).toHaveBeenCalledTimes(1);

      logger.flush();
      expect(emitA).toHaveBeenCalledTimes(2);
      expect(emitA).toHaveBeenNthCalledWith(2, 1);
    });

    it('should start new group if interleaving messages exceed limit', () => {
      const emitA = jest.fn();
      const emitB = jest.fn();

      logger.logGrouped('A', emitA);

      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);

      logger.logGrouped('A', emitA);

      expect(emitA).toHaveBeenCalledTimes(2);
      expect(emitA).toHaveBeenNthCalledWith(2, 1);
    });

    it('should flush buffered messages when limit exceeded', () => {
      const emitA = jest.fn();
      const emitB = jest.fn();

      logger.logGrouped('A', emitA);
      logger.logGrouped('A', emitA);

      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);

      logger.logGrouped('A', emitA);

      expect(emitA).toHaveBeenCalledTimes(3);
      expect(emitA).toHaveBeenNthCalledWith(2, 1);
      expect(emitA).toHaveBeenNthCalledWith(3, 1);
    });

    it('should do nothing when flush is called with no pending messages', () => {
      const emit = jest.fn();
      logger.flush();
      expect(emit).not.toHaveBeenCalled();
    });

    it('should flush all groups when multiple groups have pending messages', () => {
      const emitA = jest.fn();
      const emitB = jest.fn();

      logger.logGrouped('A', emitA);
      logger.logGrouped('A', emitA);
      logger.logGrouped('B', emitB);
      logger.logGrouped('B', emitB);

      expect(emitA).toHaveBeenCalledTimes(1);
      expect(emitB).toHaveBeenCalledTimes(1);

      logger.flush();

      expect(emitA).toHaveBeenCalledTimes(2);
      expect(emitA).toHaveBeenNthCalledWith(2, 1);
      expect(emitB).toHaveBeenCalledTimes(2);
      expect(emitB).toHaveBeenNthCalledWith(2, 1);
    });

    it('should do nothing when flush is called twice', () => {
      const emit = jest.fn();
      logger.logGrouped('warn', emit);
      logger.logGrouped('warn', emit);

      logger.flush();
      expect(emit).toHaveBeenCalledTimes(2);

      logger.flush();
      expect(emit).toHaveBeenCalledTimes(2);
    });
  });
});
