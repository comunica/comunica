import type { TestResult } from '../lib/TestResult';
import { passTestVoidWithSideData, passTestVoid, passTestWithSideData, failTest, passTest } from '../lib/TestResult';

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
          const _value: number = result.get();
        } else {
          const _value: undefined = result.get();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _value: undefined = result.get();
        } else {
          const _value: number = result.get();
        }
      });
    });

    describe('getOrThrow', () => {
      it('should get value', () => {
        const value: number = result.getOrThrow();
        expect(value).toBe(3);
      });
    });

    describe('getSideData', () => {
      it('should get the side data', () => {
        const value: undefined = result.getSideData();
        expect(value).toBeUndefined();
      });
    });

    describe('getFailMessage', () => {
      it('should get undefined', () => {
        const message: string | undefined = result.getFailMessage();
        expect(message).toBeUndefined();
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const _message: undefined = result.getFailMessage();
        } else {
          const _message: string = result.getFailMessage();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _message: string = result.getFailMessage();
        } else {
          const _message: undefined = result.getFailMessage();
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

  describe('for a passed value with side data', () => {
    let result: TestResult<number, string>;
    beforeEach(() => {
      result = passTestWithSideData(3, 'my side data');
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
          const _value: number = result.get();
        } else {
          const _value: undefined = result.get();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _value: undefined = result.get();
        } else {
          const _value: number = result.get();
        }
      });
    });

    describe('getOrThrow', () => {
      it('should get value', () => {
        const value: number = result.getOrThrow();
        expect(value).toBe(3);
      });
    });

    describe('getSideData', () => {
      it('should get the side data', () => {
        const value: string = result.getSideData();
        expect(value).toBe('my side data');
      });
    });

    describe('getFailMessage', () => {
      it('should get undefined', () => {
        const message: string | undefined = result.getFailMessage();
        expect(message).toBeUndefined();
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const _message: undefined = result.getFailMessage();
        } else {
          const _message: string = result.getFailMessage();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _message: string = result.getFailMessage();
        } else {
          const _message: undefined = result.getFailMessage();
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

  describe('for a passed void value', () => {
    let result: TestResult<any>;
    beforeEach(() => {
      result = passTestVoid();
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
        const value: any | undefined = result.get();
        expect(value).toBe(true);
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const _value: any = result.get();
        } else {
          const _value: undefined = result.get();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _value: undefined = result.get();
        } else {
          const _value: any = result.get();
        }
      });
    });

    describe('getOrThrow', () => {
      it('should get value', () => {
        const value: any = result.getOrThrow();
        expect(value).toBe(true);
      });
    });

    describe('getSideData', () => {
      it('should get the side data', () => {
        const value: undefined = result.getSideData();
        expect(value).toBeUndefined();
      });
    });

    describe('getFailMessage', () => {
      it('should get undefined', () => {
        const message: string | undefined = result.getFailMessage();
        expect(message).toBeUndefined();
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const _message: undefined = result.getFailMessage();
        } else {
          const _message: string = result.getFailMessage();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _message: string = result.getFailMessage();
        } else {
          const _message: undefined = result.getFailMessage();
        }
      });
    });
  });

  describe('for a passed void value with side data', () => {
    let result: TestResult<any, string>;
    beforeEach(() => {
      result = passTestVoidWithSideData('my side data');
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
        const value: any | undefined = result.get();
        expect(value).toBe(true);
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const _value: any = result.get();
        } else {
          const _value: undefined = result.get();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _value: undefined = result.get();
        } else {
          const _value: any = result.get();
        }
      });
    });

    describe('getOrThrow', () => {
      it('should get value', () => {
        const value: any = result.getOrThrow();
        expect(value).toBe(true);
      });
    });

    describe('getSideData', () => {
      it('should get the side data', () => {
        const value: string = result.getSideData();
        expect(value).toBe('my side data');
      });
    });

    describe('getFailMessage', () => {
      it('should get undefined', () => {
        const message: string | undefined = result.getFailMessage();
        expect(message).toBeUndefined();
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const _message: undefined = result.getFailMessage();
        } else {
          const _message: string = result.getFailMessage();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _message: string = result.getFailMessage();
        } else {
          const _message: undefined = result.getFailMessage();
        }
      });
    });
  });

  describe('for a failed value', () => {
    let result: TestResult<number>;
    beforeEach(() => {
      result = failTest('I have failed');
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
          const _value: number = result.get();
        } else {
          const _value: undefined = result.get();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _value: undefined = result.get();
        } else {
          const _value: number = result.get();
        }
      });
    });

    describe('getOrThrow', () => {
      it('should throw', () => {
        expect(() => result.getOrThrow()).toThrow('I have failed');
      });
    });

    describe('getSideData', () => {
      it('should get the side data', () => {
        expect(() => result.getSideData()).toThrow('I have failed');
      });
    });

    describe('getFailMessage', () => {
      it('should get the message', () => {
        const message: string | undefined = result.getFailMessage();
        expect(message).toBe('I have failed');
      });

      it('should be type-narrowed after isPassed', () => {
        if (result.isPassed()) {
          const _message: undefined = result.getFailMessage();
        } else {
          const _message: string = result.getFailMessage();
        }
      });

      it('should be type-narrowed after isFailed', () => {
        if (result.isFailed()) {
          const _message: string = result.getFailMessage();
        } else {
          const _message: undefined = result.getFailMessage();
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
