import { validateHttpResponse } from '../lib/IQuadDestination';

const streamifyString = require('streamify-string');

describe('validateHttpResponse', () => {
  it('should do nothing with a valid response', async() => {
    await validateHttpResponse('URL', <Response> { status: 200 });
  });

  it('should cancel the body on a valid response', async() => {
    const body = <any> { cancel: jest.fn() };
    await validateHttpResponse('URL', <Response> { status: 200, body });
    expect(body.cancel).toHaveBeenCalled();
  });

  it('should throw with an invalid response', async() => {
    await expect(validateHttpResponse('URL', <Response> { status: 400 })).rejects
      .toThrowError('Could not update URL (HTTP status 400):\nempty response');
  });

  it('should throw with an invalid response with body', async() => {
    const body = streamifyString('BODY');
    await expect(validateHttpResponse('URL', <Response> { status: 400, body })).rejects
      .toThrowError('Could not update URL (HTTP status 400):\nBODY');
  });
});
