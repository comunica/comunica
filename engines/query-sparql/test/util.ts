import * as fs from 'node:fs';
import * as path from 'node:path';

const md5 = require('md5');

const fetchFn = globalThis.fetch;

export async function fetch(...args: Parameters<typeof fetchFn>): ReturnType<typeof fetchFn> {
  // eslint-disable-next-line ts/no-base-to-string
  const pth = path.join(__dirname, 'networkCache', md5(args[0].toString()));
  if (!fs.existsSync(pth)) {
    const res = await fetchFn(...args);
    const headersObject: Record<string, string> = {};
    for (const key in res.headers) {
      headersObject[key] = res.headers.get(key)!;
    }
    fs.writeFileSync(pth, JSON.stringify({
      content: await res.text().catch(() => ''),
      headers: headersObject,
      status: res.status,
      statusText: res.statusText,
    }));
  }
  const { content, headers, status, statusText } = JSON.parse(fs.readFileSync(pth).toString());
  return new Response(content, { headers, status, statusText });
};
