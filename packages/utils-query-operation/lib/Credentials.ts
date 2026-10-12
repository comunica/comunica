import { KeysHttp, KeysQueryOperation } from '@comunica/context-entries';
import type { IActionContext } from '@comunica/types';

/**
 * Split the credentials off a URL, as fetch does not accept URLs that include credentials.
 * @param value A URL that may include credentials, such as http://username:password@example.org/.
 * @return The URL without credentials, and its credentials as a decoded "username:password"-pair, if any.
 */
export function extractUrlCredentials(value: string): { url: string; auth?: string } {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { url: value };
  }
  if (!parsed.username && !parsed.password) {
    return { url: value };
  }
  const auth = `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`;

  // Remove the credentials from the original string, so that the remainder of the URL is not normalized.
  const authorityStart = value.indexOf('//') + 2;
  const authority = value.slice(authorityStart, authorityStart + value.slice(authorityStart).search(/[/?#]|$/u));
  const url = value.slice(0, authorityStart) + value.slice(authorityStart + authority.lastIndexOf('@') + 1);
  return { url, auth };
}

/**
 * Determine the URL and credentials with which a SERVICE target must be requested.
 * Credentials are taken from the target IRI itself,
 * or otherwise from a query source with the same URL, as its credentials were explicitly given for that URL.
 * @param target A SERVICE target IRI.
 * @param context An action context that may contain query sources.
 */
export function getServiceTargetCredentials(target: string, context: IActionContext): { url: string; auth?: string } {
  const { url, auth } = extractUrlCredentials(target);
  if (auth !== undefined) {
    return { url, auth };
  }
  const querySource = context.get(KeysQueryOperation.querySources)
    ?.find(querySource => querySource.source.referenceValue === url && querySource.context?.has(KeysHttp.auth));
  return { url, auth: querySource?.context?.get(KeysHttp.auth) };
}
