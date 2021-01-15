import { Readable } from 'stream';
import { ComponentsManagerBuilder } from 'componentsjs';
import * as Setup from '..';

describe('Setup', () => {
  describe('The Setup module', () => {
    beforeEach(() => {
      // Mock manager
      (<any> ComponentsManagerBuilder).prototype.build = jest.fn(() => {
        return {
          instantiate: async() => ({ run: jest.fn(), initialize: jest.fn(), deinitialize: jest.fn() }),
          configRegistry: {
            register: jest.fn(),
          },
        };
      });
    });

    it('should throw an error when constructed', () => {
      expect(() => { new (<any> Setup)(); }).toThrow();
    });

    it('should have a \'run\' function', () => {
      expect(Setup.run).toBeInstanceOf(Function);
    });

    it('should allow \'run\' to be called without optional arguments', () => {
      return Setup.run('', { argv: [], env: {}, stdin: new Readable() });
    });

    it('should allow \'run\' to be called with optional arguments', () => {
      return Setup.run('', { argv: [], env: {}, stdin: new Readable() }, 'myuri', {});
    });

    it('should throw an error when the runner resolves to false when calling \'run\'', async() => {
      // Mock manager
      (<any> ComponentsManagerBuilder).prototype.build = jest.fn(() => {
        return {
          instantiate: async() => ({
            run: () => Promise.reject(new Error('Failure setup runner')),
            initialize: jest.fn(),
            deinitialize: jest.fn(),
          }),
          configRegistry: {
            register: jest.fn(),
          },
        };
      });
      await expect(Setup.run('', { argv: [], env: {}, stdin: new Readable() }, 'myuri', {})).rejects
        .toBeTruthy();
    });
  });
});
