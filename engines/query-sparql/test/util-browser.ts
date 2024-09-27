const fetchFn = globalThis.fetch;

export async function fetch(...args: Parameters<typeof fetchFn>): ReturnType<typeof fetchFn> {
  return fetchFn(...args);
}
