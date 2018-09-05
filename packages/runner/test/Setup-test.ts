import Bluebird = require("bluebird");
import {Loader} from "componentsjs";
import {Readable} from "stream";
import {Setup} from "../lib/Setup";

describe('Setup', () => {

  describe('The Setup module', () => {

    beforeEach(() => {
      // Mock Loader
      (<any> Loader) = jest.fn(() => {
        return {
          instantiateFromUrl: () => Promise.resolve({ run: jest.fn(), initialize: jest.fn(), deinitialize: jest.fn() }),
          registerAvailableModuleResources: jest.fn(),
        };
      });
    });

    it('should not be a function', () => {
      expect(Setup).toBeInstanceOf(Function);
    });

    it('should throw an error when constructed', () => {
      expect(() => { new (<any> Setup)(); }).toThrow();
    });

    it('should have a \'run\' function', () => {
      expect(Setup.run).toBeInstanceOf(Function);
    });

    it('should allow \'run\' to be called without optional arguments', () => {
      Setup.run('', { argv: [], env: {}, stdin: new Readable() });
    });

    it('should allow \'run\' to be called with optional arguments', () => {
      Setup.run('', { argv: [], env: {}, stdin: new Readable() }, 'myuri', {});
    });

    it('should throw an error when the runner resolves to false when calling \'run\'', async () => {
      (<any> Loader) = jest.fn(() => {
        return {
          instantiateFromUrl: () => Promise.resolve(
            { deinitialize: jest.fn(), initialize: jest.fn(),
              run: () => Promise.reject(new Error('Failure setup runner')) }),
          registerAvailableModuleResources: jest.fn(),
        };
      });
      return expect(Setup.run('', { argv: [], env: {}, stdin: new Readable() }, 'myuri', {})).rejects
        .toBeTruthy();
    });
  });
});
