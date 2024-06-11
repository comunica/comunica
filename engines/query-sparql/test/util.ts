import * as fs from 'node:fs';
import * as path from 'node:path';

const md5 = require('md5');

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
    Object.entries(options).sort(([ a ], [ b ]) => a.localeCompare(b)),
  ]);
  const pth = path.join(__dirname, 'networkCache', md5(json));
  if (!fs.existsSync(pth)) {
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
