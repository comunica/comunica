import { ActionContext } from '@comunica/core';
import { ComponentsManagerBuilder } from 'componentsjs';
import { Readable } from 'readable-stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Setup from '..';

describe('Setup', () => {
  describe('The Setup module', () => {
    beforeEach(() => {
      // Mock manager
      vi.spyOn((<any> ComponentsManagerBuilder).prototype, 'build').mockImplementation(() => {
        return {
          instantiate: async() => ({ run: vi.fn(), initialize: vi.fn(), deinitialize: vi.fn() }),
          configRegistry: {
            register: vi.fn(),
          },
        };
      });
    });

    it('should throw an error when constructed', () => {
      expect(() => {
        new (<any> Setup)();
      }).toThrow('is not a constructor');
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
      vi.spyOn((<any> ComponentsManagerBuilder).prototype, 'build').mockImplementation(() => {
        return {
          instantiate: async() => ({
            run: async() => {
              throw new Error('Failure setup runner');
            },
            initialize: vi.fn(),
            deinitialize: vi.fn(),
          }),
          configRegistry: {
            register: vi.fn(),
          },
        };
      });
      await expect(Setup
        .run('', { argv: [], env: {}, stdin: new Readable(), context: new ActionContext() }, 'myuri', {})).rejects
        .toBeTruthy();
    });
  });
});
