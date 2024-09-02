import type { TestResult } from '../lib/TestResult';
import { failTest, passTest } from '../lib/TestResult';

describe('TestResult', () => {
  describe('for a passed value', () => {
    let result: TestResult<number>;
    beforeEach(() => {
      result = passTest(3);
    });

    describe('isPassed', () => {
      it('should be true', () => {
        expect(result.isPassed()).toBeTruthy();
      });
    });

    describe('isFailed', () => {
      it('should be false', () => {
        expect(result.isFailed()).toBeFalsy();
      });
    });

    describe('get', () => {
      it('should get value or undefined', () => {
        const value: number | undefined = result.get();
        expect(value).toBe(3);
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const value: number = result.get();
        } else {
          const value: undefined = result.get();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const value: undefined = result.get();
        } else {
          const value: number = result.get();
        }
      });
    });

    describe('getOrThrow', () => {
      it('should get value', () => {
        const value: number = result.getOrThrow();
        expect(value).toBe(3);
      });
    });

    describe('getFailMessage', () => {
      it('should get undefined', () => {
        const message: (() => string) | undefined = result.getFailMessage();
        expect(message).toBeUndefined();
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const message: undefined = result.getFailMessage();
        } else {
          const message: () => string = result.getFailMessage();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const message: () => string = result.getFailMessage();
        } else {
          const message: undefined = result.getFailMessage();
        }
      });
    });

    describe('map', () => {
      it('should convert a value', () => {
        const result2 = result.map(value => value + 1);
        const result3 = result2.map(value => value + 2);
        expect(result3.get()).toBe(6);
      });
    });

    describe('mapAsync', () => {
      it('should convert a value asynchronously', async() => {
        const result2 = await result.mapAsync(value => Promise.resolve(value + 1));
        const result3 = await result2.mapAsync(value => Promise.resolve(value + 2));
        expect(result3.get()).toBe(6);
      });
    });
  });

  describe('for a failed value', () => {
    let result: TestResult<number>;
    beforeEach(() => {
      result = failTest(() => 'I have failed');
    });

    describe('isPassed', () => {
      it('should be false', () => {
        expect(result.isPassed()).toBeFalsy();
      });
    });

    describe('isFailed', () => {
      it('should be true', () => {
        expect(result.isFailed()).toBeTruthy();
      });
    });

    describe('get', () => {
      it('should get value or undefined', () => {
        const value: number | undefined = result.get();
        expect(value).toBeUndefined();
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const value: number = result.get();
        } else {
          const value: undefined = result.get();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const value: undefined = result.get();
        } else {
          const value: number = result.get();
        }
      });
    });

    describe('getOrThrow', () => {
      it('should throw', () => {
        expect(() => result.getOrThrow()).toThrow('I have failed');
      });
    });

    describe('getFailMessage', () => {
      it('should get the message', () => {
        const message: (() => string) | undefined = result.getFailMessage();
        expect(message!()).toBe('I have failed');
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const message: undefined = result.getFailMessage();
        } else {
          const message: () => string = result.getFailMessage();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const message: () => string = result.getFailMessage();
        } else {
          const message: undefined = result.getFailMessage();
        }
      });
    });

    describe('map', () => {
      it('should convert a value', () => {
        const result2 = result.map(value => value + 1);
        const result3 = result2.map(value => value + 2);
        expect(result3.get()).toBeUndefined();
      });
    });

    describe('mapAsync', () => {
      it('should convert a value asynchronously', async() => {
        const result2 = await result.mapAsync(value => Promise.resolve(value + 1));
        const result3 = await result2.mapAsync(value => Promise.resolve(value + 2));
        expect(result3.get()).toBeUndefined();
      });
    });
  });
});
