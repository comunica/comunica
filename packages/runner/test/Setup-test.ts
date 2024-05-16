import { ActionContext } from '@comunica/core';
import { ComponentsManagerBuilder } from 'componentsjs';
import { Readable } from 'readable-stream';
import * as Setup from '..';

describe('Setup', () => {
  describe('The Setup module', () => {
    beforeEach(() => {
      // Mock manager
      jest.spyOn((<any> ComponentsManagerBuilder).prototype, 'build').mockImplementation(() => {
        return {
          instantiate: async() => ({ run: jest.fn(), initialize: jest.fn(), deinitialize: jest.fn() }),
          configRegistry: {
            register: jest.fn(),
          },
        };
      });
    });

    it('should throw an error when constructed', () => {
      expect(() => {
        new (<any> Setup)();
      }).toThrow('Setup is not a constructor');
    });

    it('should have a \'run\' function', () => {
      expect(Setup.run).toBeInstanceOf(Function);
    });

    it('should allow \'run\' to be called without optional arguments', async() => {
      await Setup.run('', { argv: [], env: {}, stdin: new Readable(), context: new ActionContext() });
    });

    it('should allow \'run\' to be called with optional arguments', async() => {
      await Setup.run('', { argv: [], env: {}, stdin: new Readable(), context: new ActionContext() }, 'myuri', {});
    });

    it('should throw an error when the runner resolves to false when calling \'run\'', async() => {
      // Mock manager
      jest.spyOn((<any> ComponentsManagerBuilder).prototype, 'build').mockImplementation(() => {
        return {
          instantiate: async() => ({
            run: async() => {
              throw new Error('Failure setup runner');
            },
            initialize: jest.fn(),
            deinitialize: jest.fn(),
          }),
          configRegistry: {
            register: jest.fn(),
          },
        };
      });
      await expect(Setup
        .run('', { argv: [], env: {}, stdin: new Readable(), context: new ActionContext() }, 'myuri', {})).rejects
        .toBeTruthy();
    });
  });
});
