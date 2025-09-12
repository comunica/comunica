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

  const json = JSON.stringify([
    // eslint-disable-next-line ts/no-base-to-string
    args[0].toString(),
    Object.entries(options)
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
  const jsonHash = createHash('md5', { encoding: 'utf-8' }).update(json).digest('hex');
  const pth = path.join(__dirname, 'networkCache', jsonHash);
  if (!fs.existsSync(pth)) {
    // eslint-disable-next-line no-console
    console.warn(`Creating new test network cache entry for request: ${json} (${pth})}`);
    const res = await fetchFn(...args);
    fs.writeFileSync(pth, JSON.stringify({
      ...res,
      content: await res.text(),
      // @ts-expect-error
      headers: [ ...res.headers.entries() ],
    }));
  }
  const { content, ...init } = JSON.parse(fs.readFileSync(pth).toString());
  return new Response(content, init);
};
