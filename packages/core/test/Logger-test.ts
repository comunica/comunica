import {Logger} from "../lib/Logger";

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
});
