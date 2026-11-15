import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const fetchFn = globalThis.fetch;

export async function fetch(...args: Parameters<typeof fetchFn>): ReturnType<typeof fetchFn> {
  const options = { ...args[1] };
  for (const key in options) {
    if (typeof options[<keyof typeof options> key] === 'undefined') {
      delete options[<keyof typeof options> key];
    }
  }

  // @ts-expect-error
  options.headers = Object.fromEntries(options.headers?.entries() ?? []);

  const toJson = (entries: [string, any][]): string => JSON.stringify([
    // eslint-disable-next-line ts/no-base-to-string
    args[0].toString(),
    entries
      .map(([ k, v ]: [ string, any ]) => {
        // Omit user-agent header, as this can be different when running on different systems.
        if (k === 'headers') {
          v = { ...v };
          delete v['user-agent'];
        }
        return [ k, v ];
      })
      .sort(([ a ], [ b ]) => a.localeCompare(b)),
  ]);
  const toPath = (json: string): string =>
    path.join(__dirname, 'networkCache', createHash('md5', { encoding: 'utf-8' }).update(json).digest('hex'));
  const json = toJson(Object.entries(options));
  let pth = toPath(json);
  // An abort signal does not affect the response, so also look for the entry of the request without signal
  if (!fs.existsSync(pth) && 'signal' in options) {
    pth = toPath(toJson(Object.entries(options).filter(([ k ]) => k !== 'signal')));
  }
  if (!fs.existsSync(pth)) {
    // eslint-disable-next-line no-console
    console.warn(`Creating new test network cache entry for request: ${json} (${pth})}`);
    const res = await fetchFn(...args);
    fs.writeFileSync(pth, JSON.stringify({
      ...res,
      content: await res.text(),
      headers: [ ...res.headers.entries() ],
    }));
  }
  const { content, ...init } = JSON.parse(fs.readFileSync(pth).toString());
  return new Response(content, init);
};
