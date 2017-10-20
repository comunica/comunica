import Bluebird = require("bluebird");
import {Loader} from "lsd-components";
import {Readable} from "stream";
import {Setup} from "../lib/Setup";

describe('Setup', () => {

  describe('The Setup module', () => {
    it('should not be a function', () => {
      expect(Setup).toBeInstanceOf(Function);
    });

    it('should throw an error when constructed', () => {
      expect(() => { new (<any> Setup)(); }).toThrow();
    });

    it('should have a \'run\' function', () => {
      expect(Setup.run).toBeInstanceOf(Function);
    });

    it('should allow \'preparePromises\' to be called only once when running \'run\'', () => {
      const spy = jest.spyOn((<any> Setup), 'preparePromises');

      // Mock Loader
      (<any> Loader) = jest.fn(() => {
        return {
          instantiateFromUrl: () => Promise.resolve({ run: jest.fn() }),
          registerAvailableModuleResources: jest.fn(),
        };
      });

      Setup.run('', { argv: [], env: {}, stdin: new Readable() });
      Setup.run('', { argv: [], env: {}, stdin: new Readable() });
      Setup.run('', { argv: [], env: {}, stdin: new Readable() });

      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('should have a \'preparePromises\' function', () => {
      expect((<any> Setup).preparePromises).toBeInstanceOf(Function);
    });

    it('should modify Promise to be a Bluebird promise after calling \'preparePromises\'', () => {
      (<any> Setup).preparePromises();
      expect(Promise).toBe(Bluebird);
    });

    it('should enable promises to be cancelled', () => {
      (<any> Setup).preparePromises();

      const p1 = new Bluebird((resolve, reject, onCancel) => {
        // Nothing...
      });
      expect(p1.isCancelled()).toBe(false);
      p1.cancel();
      expect(p1.isCancelled()).toBe(true);
    });

    it('should enable \'await\' to be used on Bluebird promises', () => {
      (<any> Setup).preparePromises();

      expect(makePromise()).toBeInstanceOf(Bluebird);

      async function makePromise() {
        const p1 = new Promise((resolve, reject) => {
          resolve('a');
        });
        return await p1;
      }
    });

    it('should enable awaited promises to be cancelled', () => {
      (<any> Setup).preparePromises();

      return expect(new Promise((resolveC, rejectC) => {
        let p1;

        const p2: Bluebird<any> = <Bluebird<any>> <any> makePromise();
        p2.cancel();

        async function makePromise() {
          p1 = new Bluebird((resolve, reject, onCancel) => {
            onCancel(() => resolveC(true));
          });
          return await p1;
        }
      })).resolves.toBe(true);
    });
  });
});
