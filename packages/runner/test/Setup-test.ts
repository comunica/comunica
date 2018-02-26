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

    it('should allow \'preparePromises\' to be called only once when running \'run\'', () => {
      const spy = jest.spyOn((<any> Setup), 'preparePromises');

      Setup.run('', { argv: [], env: {}, stdin: new Readable() });
      Setup.run('', { argv: [], env: {}, stdin: new Readable() });
      Setup.run('', { argv: [], env: {}, stdin: new Readable() });

      expect(spy).toHaveBeenCalledTimes(1);

      spy.mockRestore();
    });

    it('should have a \'preparePromises\' function', () => {
      expect((<any> Setup).preparePromises).toBeInstanceOf(Function);
    });

    it('should allow \'run\' to be called without optional arguments', () => {
      Setup.run('', { argv: [], env: {}, stdin: new Readable() });
    });

    it('should allow \'run\' to be called with optional arguments', () => {
      Setup.run('', { argv: [], env: {}, stdin: new Readable() }, 'myuri', {});
    });

    it('should throw an error when the runner resolves to false when calling \'run\'', () => {
      (<any> Loader) = jest.fn(() => {
        return {
          instantiateFromUrl: () => Promise.resolve(
            { run: Promise.reject(true), initialize: jest.fn(), deinitialize: jest.fn() }),
          registerAvailableModuleResources: jest.fn(),
        };
      });
      return expect(Setup.run('', { argv: [], env: {}, stdin: new Readable() }, 'myuri', {})).rejects
        .toBeTruthy();
    });
  });
});
