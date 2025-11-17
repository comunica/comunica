import { ActionContext } from '@comunica/core';
import { FetchInitPreprocessor } from '../lib/FetchInitPreprocessor-browser';
import type { IFetchInitPreprocessor } from '../lib/IFetchInitPreprocessor';

describe('FetchInitPreprocessor-browser', () => {
  let preprocessor: IFetchInitPreprocessor;

  beforeEach(() => {
    preprocessor = new FetchInitPreprocessor();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('handle', () => {
    it('should handle init without body', async() => {
      await expect(preprocessor.handle({}, new ActionContext())).resolves.toEqual({ keepalive: true });
    });

    it('should handle init with body', async() => {
      const body = new ReadableStream({
        async pull(controller) {
          controller.enqueue('abc');
          controller.close();
        },
      });
      await expect(preprocessor.handle({ body }, new ActionContext())).resolves.toStrictEqual({
        body: 'abc',
        keepalive: false,
      });
    });
  });
});
