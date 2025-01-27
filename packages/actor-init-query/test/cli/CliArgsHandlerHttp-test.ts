import type { Argv } from 'yargs';
import { CliArgsHandlerHttp } from '../../lib/cli/CliArgsHandlerHttp';

describe('CliArgsHandlerHttp', () => {
  let handler: CliArgsHandlerHttp;
  let argumentsBuilder: Argv<any>;

  beforeEach(() => {
    jest.resetAllMocks();
    handler = new CliArgsHandlerHttp();
    argumentsBuilder = <any>{
      usage: jest.fn().mockReturnThis(),
      example: jest.fn().mockReturnThis(),
      options: jest.fn().mockReturnThis(),
      check: jest.fn().mockReturnThis(),
    };
  });

  describe('populateYargs', () => {
    it.each([
      'port',
      'workers',
      'timeout',
      'update',
      'invalidateCache',
      'freshWorker',
      'contextOverride',
    ])('adds %s as option to argumentsBuilder', async(option) => {
      expect(() => handler.populateYargs(argumentsBuilder)).not.toThrow();
      expect(argumentsBuilder.usage).toHaveBeenCalledTimes(1);
      expect(argumentsBuilder.example).toHaveBeenCalledTimes(1);
      expect(argumentsBuilder.options).toHaveBeenCalledTimes(1);
      expect(argumentsBuilder.options).toHaveBeenCalledWith(expect.objectContaining({ [option]: expect.any(Object) }));
      expect(argumentsBuilder.check).toHaveBeenCalledTimes(1);
    });

    it('accepts version arg on its own', async() => {
      let check: (args: Record<string, any>) => void;
      jest.spyOn(argumentsBuilder, 'check').mockImplementation((checkFn: any): Argv<any> => {
        check = checkFn;
        return argumentsBuilder;
      });
      expect(() => handler.populateYargs(argumentsBuilder)).not.toThrow();
      expect(() => check({ version: true })).not.toThrow();
    });

    it('disallows sources with context', async() => {
      let check: (args: Record<string, any>) => void;
      jest.spyOn(argumentsBuilder, 'check').mockImplementation((checkFn: any): Argv<any> => {
        check = checkFn;
        return argumentsBuilder;
      });
      const errorMessage = 'At least one source must be provided';
      expect(() => handler.populateYargs(argumentsBuilder)).not.toThrow();
      expect(() => check({ context: false, sources: []})).toThrow(errorMessage);
      expect(() => check({ context: false, sources: [ 's' ]})).not.toThrow();
      expect(() => check({ context: true, sources: []})).not.toThrow();
      expect(() => check({ context: true, sources: [ 's' ]})).toThrow(errorMessage);
    });
  });

  describe('handleArgs', () => {
    it('does nothing', async() => {
      const args = {};
      const context = {};
      jest.spyOn(handler, 'populateYargs').mockImplementation();
      await expect(handler.handleArgs(args, context)).resolves.toBeUndefined();
      expect(args).toEqual({});
      expect(context).toEqual({});
    });
  });
});
