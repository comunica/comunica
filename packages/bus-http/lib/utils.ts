// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
import stringifyStream = require('stream-to-string');
import { ActorHttp } from './ActorHttp';

/**
 * Check if the http response is valid, and throw an error if not.
 * @param url The original URL that was to be updated.
 * @param httpResponse The update response.
 */
export async function validateAndCloseHttpResponse(url: string, httpResponse: Response): Promise<void> {
  // Check if update was successful
  if (httpResponse.status >= 400) {
    // Consume the body, to avoid process to hang
    let bodyString = 'empty response';
    if (httpResponse.body) {
      const responseStream = ActorHttp.toNodeReadable(httpResponse.body);
      bodyString = await stringifyStream(responseStream);
    }
    throw new Error(`Could not update ${url} (HTTP status ${httpResponse.status}):\n${bodyString}`);
  }

  // Close response body, as we don't need it
  await httpResponse.body?.cancel();
}
