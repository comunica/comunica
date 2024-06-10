import { validateAndCloseHttpResponse } from '../lib/utils';

const streamifyString = require('streamify-string');

describe('validateAndCloseHttpResponse', () => {
  it('should do nothing with a valid response', async() => {
    await validateAndCloseHttpResponse('URL', <Response> { status: 200 });
  });

  it('should cancel the body on a valid response', async() => {
    const body = <any> { cancel: jest.fn() };
    await validateAndCloseHttpResponse('URL', <Response> { status: 200, body });
    expect(body.cancel).toHaveBeenCalledTimes(1);
  });

  it('should throw with an invalid response', async() => {
    await expect(validateAndCloseHttpResponse('URL', <Response> { status: 400 })).rejects
      .toThrow('Could not update URL (HTTP status 400):\nempty response');
  });

  it('should throw with an invalid response with body', async() => {
    const body = streamifyString('BODY');
    await expect(validateAndCloseHttpResponse('URL', <Response> { status: 400, body })).rejects
      .toThrow('Could not update URL (HTTP status 400):\nBODY');
  });
});
